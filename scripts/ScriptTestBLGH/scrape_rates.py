"""
Scrape live room-type rates from the NightsBridge public booking widget.

Usage:
    python scrape_rates.py <arrive> <depart>          # e.g. 2026-06-20 2026-06-22
    HEADLESS=false python scrape_rates.py 2026-06-20 2026-06-22

The script:
    1. Opens https://book.nightsbridge.com/<BBID>?arrive=<arrive>&depart=<depart>
    2. Waits for the Angular SPA to render room-type cards
    3. Scrapes: rtname, description, rate_single, rate_double, max_guests,
       children_policy, available, image_url
    4. Saves output/rates_{arrive}_{depart}.json
    5. Upserts into the Supabase rate_cache table (if credentials are set)

IMPORTANT — SELECTOR VERIFICATION:
    The NightsBridge booking widget is an Angular SPA. CSS class names below
    are best-effort guesses. Run with HEADLESS=false the first time, open
    DevTools (F12) → Elements tab, and update the SELECTORS dict below to
    match the actual rendered DOM structure.

Dependencies (from requirements.txt):
    playwright  python-dotenv  supabase
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

load_dotenv()
_root_env = Path(__file__).resolve().parents[2] / ".env.local"
if _root_env.exists():
    load_dotenv(_root_env, override=False)

try:
    from supabase import create_client as _create_client
    _supabase_available = True
except ImportError:
    _supabase_available = False

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BBID: int = int(os.environ.get("NB_BBID", "21091"))

HEADLESS: bool = os.environ.get("HEADLESS", "true").lower() not in ("false", "0", "no")

TIMEOUT_MS: int = 30_000   # wait for Angular render

OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# CSS SELECTORS — update after inspecting with HEADLESS=false
#
# Strategy: we try multiple selector candidates in order and use the first one
# that finds elements on the page.
# ---------------------------------------------------------------------------

# Candidates for the room-type card container (outermost element per room)
CARD_CANDIDATES = [
    ".room-type",
    ".roomtype",
    "nb-room-type",
    "[class*='room-type']",
    "[class*='roomType']",
    ".nb-unit",
    ".room-card",
    "app-room-type",
    "app-roomtype",
]

# Within each card — selectors for individual fields
FIELD_SELECTORS = {
    # Room-type name
    "name": [".room-name", ".roomtypename", "h2", "h3", ".title", "[class*='name']"],
    # Description / blurb
    "description": [".description", ".room-description", ".blurb", "p.text"],
    # Price for 1 adult (single rate)
    "rate_single": [
        ".rate-single", ".single-rate", "[data-rate-single]",
        ".price-single", "[class*='single']",
    ],
    # Price for 2 adults (double rate) — or the main price if single not shown
    "rate_double": [
        ".rate-double", ".double-rate", "[data-rate-double]",
        ".price-double", ".price", ".rate", ".amount", "[class*='price']",
        "[class*='rate']",
    ],
    # Max guests / occupancy
    "max_guests": [
        "[class*='occupancy']", "[class*='guest']", ".max-guests",
        ".capacity", "[class*='max']",
    ],
    # Children policy text
    "children_policy": [
        "[class*='children']", "[class*='child']", ".policy",
        "[class*='policy']",
    ],
    # Sold-out / unavailable indicator
    "sold_out": [
        ".sold-out", ".unavailable", "[class*='sold']", "[class*='unavailable']",
        "button:disabled", ".closed",
    ],
    # Primary room image
    "image": ["img"],
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PRICE_RE = re.compile(r"[\d\s,.]+")


def _parse_price(text: str) -> Optional[float]:
    """Extract a numeric ZAR price from a text like 'R 1,250' or '1250.00'."""
    cleaned = _PRICE_RE.search(text.replace("\u00a0", " ").replace(",", ""))
    if cleaned:
        try:
            return float(cleaned.group().replace(" ", ""))
        except ValueError:
            pass
    return None


def _first_text(element, selectors: list[str]) -> Optional[str]:
    for sel in selectors:
        try:
            el = element.query_selector(sel)
            if el:
                txt = el.inner_text().strip()
                if txt:
                    return txt
        except Exception:
            continue
    return None


def _first_attr(element, selectors: list[str], attr: str) -> Optional[str]:
    for sel in selectors:
        try:
            el = element.query_selector(sel)
            if el:
                val = el.get_attribute(attr)
                if val:
                    return val.strip()
        except Exception:
            continue
    return None


# ---------------------------------------------------------------------------
# Core scraping
# ---------------------------------------------------------------------------

def scrape(arrive: str, depart: str) -> list[dict]:
    url = f"https://book.nightsbridge.com/{BBID}?arrive={arrive}&depart={depart}"
    print(f"Opening: {url}")
    print(f"Headless: {HEADLESS}")

    results: list[dict] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=HEADLESS, args=["--disable-dev-shm-usage", "--no-sandbox"])
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=TIMEOUT_MS)
        except PlaywrightTimeout:
            print("WARNING: Page load timed out on domcontentloaded; continuing...")

        # Give Angular a chance to bootstrap and render room cards
        page.wait_for_timeout(4_000)

        # Try each card-container selector until we find rendered rooms
        cards = []
        matched_selector = None
        for candidate in CARD_CANDIDATES:
            try:
                page.wait_for_selector(candidate, timeout=5_000)
                cards = page.query_selector_all(candidate)
                if cards:
                    matched_selector = candidate
                    print(f"Room cards found with selector: {candidate!r} ({len(cards)} cards)")
                    break
            except PlaywrightTimeout:
                continue

        if not cards:
            print(
                "ERROR: No room-type cards found on the page.\n"
                "Run with HEADLESS=false and inspect the DOM to find the right selector.\n"
                "Update CARD_CANDIDATES in this script accordingly."
            )
            # Dump page source for debugging
            debug_path = OUTPUT_DIR / f"debug_{arrive}_{depart}.html"
            debug_path.write_text(page.content(), encoding="utf-8")
            print(f"Page HTML saved to: {debug_path}")
            browser.close()
            return []

        print(f"Scraping {len(cards)} room types...")

        for card in cards:
            name = _first_text(card, FIELD_SELECTORS["name"])
            if not name:
                # Skip elements that don't look like room cards
                continue

            description = _first_text(card, FIELD_SELECTORS["description"])

            # Rates
            rate_single_txt = _first_text(card, FIELD_SELECTORS["rate_single"])
            rate_double_txt = _first_text(card, FIELD_SELECTORS["rate_double"])
            rate_single = _parse_price(rate_single_txt) if rate_single_txt else None
            rate_double = _parse_price(rate_double_txt) if rate_double_txt else None

            # Max guests
            max_guests_txt = _first_text(card, FIELD_SELECTORS["max_guests"])
            max_guests: Optional[int] = None
            if max_guests_txt:
                nums = re.findall(r"\d+", max_guests_txt)
                max_guests = int(nums[0]) if nums else None

            # Children policy
            children_policy = _first_text(card, FIELD_SELECTORS["children_policy"])

            # Availability — sold-out element present = unavailable
            sold_el = card.query_selector(" ,".join(FIELD_SELECTORS["sold_out"]))
            available = sold_el is None

            # Image
            image_url = _first_attr(card, FIELD_SELECTORS["image"], "src")
            # Make absolute if needed
            if image_url and image_url.startswith("//"):
                image_url = "https:" + image_url
            elif image_url and image_url.startswith("/"):
                image_url = f"https://book.nightsbridge.com{image_url}"

            room = {
                "bbid": BBID,
                "rtname": name,
                "description": description,
                "rate_single": rate_single,
                "rate_double": rate_double,
                "max_guests": max_guests,
                "children_policy": children_policy,
                "available": available,
                "image_url": image_url,
                "arrive": arrive,
                "depart": depart,
                "scraped_at": datetime.utcnow().isoformat() + "Z",
                "_selector_used": matched_selector,
            }
            results.append(room)
            print(f"  {'✓' if available else '✗ (sold)'} {name}: single={rate_single} double={rate_double}")

        browser.close()

    return results


# ---------------------------------------------------------------------------
# Save to JSON
# ---------------------------------------------------------------------------

def save_json(results: list[dict], arrive: str, depart: str) -> Path:
    path = OUTPUT_DIR / f"rates_{arrive}_{depart}.json"
    path.write_text(json.dumps(results, indent=2, default=str), encoding="utf-8")
    print(f"\nSaved {len(results)} records → {path}")
    return path


# ---------------------------------------------------------------------------
# Upsert to Supabase rate_cache
# ---------------------------------------------------------------------------

def upsert_supabase(results: list[dict]) -> None:
    if not _supabase_available:
        print("supabase package not installed — skipping upsert.")
        return

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping upsert.")
        return

    supabase = _create_client(url, key)

    rows = [
        {
            "bbid": r["bbid"],
            "rtname": r["rtname"],
            "rate_single": r["rate_single"],
            "rate_double": r["rate_double"],
            "available": r["available"],
            "arrive": r["arrive"],
            "depart": r["depart"],
            "scraped_at": r["scraped_at"],
        }
        for r in results
        if r.get("rtname")
    ]

    if not rows:
        print("No valid rows to upsert.")
        return

    resp = supabase.table("rate_cache").upsert(rows, on_conflict="bbid,rtname,arrive,depart").execute()
    if hasattr(resp, "data"):
        print(f"Upserted {len(resp.data)} rows into rate_cache.")
    else:
        print("Upsert complete.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(
            "Usage: python scrape_rates.py <arrive YYYY-MM-DD> <depart YYYY-MM-DD>\n"
            "Example: python scrape_rates.py 2026-06-20 2026-06-22"
        )

    arrive_arg = sys.argv[1].strip()
    depart_arg = sys.argv[2].strip()

    # Basic format validation
    for label, val in [("arrive", arrive_arg), ("depart", depart_arg)]:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", val):
            sys.exit(f"ERROR: {label} must be YYYY-MM-DD, got: {val!r}")

    if arrive_arg >= depart_arg:
        sys.exit("ERROR: arrive must be before depart.")

    data = scrape(arrive_arg, depart_arg)

    if data:
        save_json(data, arrive_arg, depart_arg)
        upsert_supabase(data)
    else:
        print("No data scraped — see debug HTML file in output/ for troubleshooting.")
        sys.exit(1)
