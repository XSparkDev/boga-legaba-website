"""
Scrape room/property image URLs from the NightsBridge Owner Webview (Web Info).

bridgeitapi does NOT return images. This script logs in via Playwright, opens
Web Info, collects <img src="…"> URLs (no downloads), and stores them in
media_asset.source_url.

Run after sync:  python images.py
"""

from __future__ import annotations

import os
import re
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
_root_env = Path(__file__).resolve().parents[2] / ".env.local"
if _root_env.exists():
    load_dotenv(_root_env, override=False)

try:
    from supabase import create_client
except ImportError:
    create_client = None  # type: ignore

import auth
import config

_SKIP_SRC = re.compile(r"data:|\.svg$|logo|icon|avatar|spinner|placeholder", re.I)
_WEBINFO_HINTS = re.compile(r"web\s*info|room\s*type|pictures|facilities|gallery", re.I)


def _slug(value: str) -> str:
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))


def _similar(a: str, b: str) -> float:
    return SequenceMatcher(None, _slug(a), _slug(b)).ratio()


def _supabase():
    if create_client is None:
        raise RuntimeError("pip install supabase")
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").replace("/rest/v1/", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    return create_client(url.rstrip("/"), key)


def _navigate_to_web_info(page) -> str:
    """Open Web Info in the owner webview; return the page URL reached."""
    candidates = [
        config.DASHBOARD_URL,
        "https://www.nightsbridge.com/dashboard/webinfo",
        "https://www.nightsbridge.com/dashboard/home",
    ]
    for url in candidates:
        page.goto(url, wait_until="domcontentloaded", timeout=config.TIMEOUT_MS)
        page.wait_for_timeout(1500)

    # Sidebar / menu links
    for selector in (
        "a:has-text('Web Info')",
        "button:has-text('Web Info')",
        "[href*='webinfo' i]",
        "[href*='WebInfo']",
        "text=Web Info",
    ):
        try:
            el = page.locator(selector).first
            if el.count() and el.is_visible():
                el.click(timeout=5000)
                page.wait_for_load_state("networkidle", timeout=config.TIMEOUT_MS)
                page.wait_for_timeout(2000)
                break
        except Exception:
            continue

    # Room types sub-section (Wetu / image uploader area)
    for selector in (
        "a:has-text('Room Types')",
        "button:has-text('Room Types')",
        "text=Room Types",
        "a:has-text('Room Type')",
    ):
        try:
            el = page.locator(selector).first
            if el.count() and el.is_visible():
                el.click(timeout=5000)
                page.wait_for_timeout(2000)
                break
        except Exception:
            continue

    return page.url


def _collect_image_urls(page) -> list[dict]:
    """Extract image URLs and nearby labels from the current webview page."""
    return page.evaluate(
        """() => {
          const skip = /data:|\\.svg$/i;
          const junk = /logo|icon|avatar|spinner|placeholder|facebook|instagram/i;
          const results = [];
          const seen = new Set();

          function labelFor(img) {
            const block = img.closest(
              'section, article, .card, tr, li, .panel, .room-type, [class*="room"], [class*="type"], fieldset, form, div'
            );
            if (!block) return img.alt || '';
            const heading = block.querySelector('h1,h2,h3,h4,h5,legend,label,.title,[class*="title"]');
            const text = (heading?.textContent || block.textContent || '').trim();
            return text.split('\\n').map(s => s.trim()).filter(Boolean)[0] || img.alt || '';
          }

          document.querySelectorAll('img').forEach((img) => {
            const src = img.currentSrc || img.src || '';
            if (!src || skip.test(src) || junk.test(src) || junk.test(img.alt || '')) return;
            if (seen.has(src)) return;
            seen.add(src);
            results.push({
              src,
              alt: img.alt || '',
              label: labelFor(img),
              w: img.naturalWidth || null,
              h: img.naturalHeight || null,
            });
          });

          // Background images from inline styles
          document.querySelectorAll('[style*="background"]').forEach((el) => {
            const style = el.getAttribute('style') || '';
            const m = style.match(/url\\(['"]?([^'")]+)['"]?\\)/i);
            if (!m) return;
            const src = m[1];
            if (!src || skip.test(src) || junk.test(src) || seen.has(src)) return;
            seen.add(src);
            results.push({
              src,
              alt: '',
              label: (el.textContent || '').trim().slice(0, 80),
              w: null,
              h: null,
            });
          });

          return results;
        }"""
    )


def _match_room(label: str, rooms: list[dict]) -> dict | None:
    if not label:
        return None
    best: dict | None = None
    best_score = 0.0
    clean = re.sub(r"\s+", " ", label).strip()
    for room in rooms:
        for candidate in (
            room.get("room_name") or "",
            (room.get("room_type") or {}).get("rtname") or "",
        ):
            if not candidate:
                continue
            score = _similar(clean, candidate)
            if candidate.lower() in clean.lower():
                score = max(score, 0.92)
            if score > best_score:
                best_score = score
                best = room
    return best if best_score >= 0.55 else None


def _save_media(sb, row: dict) -> None:
    sb.table("media_asset").delete().eq("entity_type", row["entity_type"]).eq("entity_key", row["entity_key"]).eq(
        "source", "nightsbridge"
    ).execute()
    sb.table("media_asset").insert(row).execute()


def scrape_webview_images(browser) -> int:
    """
    Authenticated scrape of NightsBridge Web Info → store image URLs only.
    Reuses an open Playwright browser (call from main.py after sync).
    """
    context, page = auth.get_authenticated_context(browser)
    count = 0
    try:
        reached = _navigate_to_web_info(page)
        print(f"Webview image scrape at: {reached}")

        raw_images = _collect_image_urls(page)
        if not raw_images:
            print("No images found on Web Info page — try HEADLESS=false to debug.")
            return 0

        sb = _supabase()
        rooms_res = (
            sb.table("room")
            .select("bbroomid, room_name, property_name, bbid, room_type(rtname)")
            .eq("is_active", True)
            .execute()
        )
        rooms = rooms_res.data or []
        bbid = rooms[0].get("bbid", 21091) if rooms else 21091

        matched_room_ids: set[int] = set()
        for i, img in enumerate(raw_images):
            src = img.get("src", "")
            if not src or _SKIP_SRC.search(src):
                continue

            label = img.get("label") or img.get("alt") or ""
            room = _match_room(label, rooms)

            if room:
                bbroomid = room["bbroomid"]
                matched_room_ids.add(bbroomid)
                entity_key = f"room:{bbroomid}"
                _save_media(
                    sb,
                    {
                        "bbroomid": bbroomid,
                        "bbid": room.get("bbid", bbid),
                        "entity_type": "room",
                        "entity_key": entity_key,
                        "source": "nightsbridge",
                        "source_url": src,
                        "local_path": None,
                        "alt_text": img.get("alt") or f"{room['room_name']} — NightsBridge",
                        "width": img.get("w"),
                        "height": img.get("h"),
                        "is_primary": True,
                        "sort_order": 0,
                        "metadata": {
                            "scrape_page": reached,
                            "matched_label": label,
                            "scrape_source": "webview_web_info",
                        },
                        "updated_at": datetime.utcnow().isoformat(),
                    },
                )
                count += 1
                print(f"  room {room['room_name']}: {src[:80]}…")
            elif _WEBINFO_HINTS.search(label) or i == 0:
                entity_key = f"property:{bbid}:webview:{_slug(label) or i}"
                _save_media(
                    sb,
                    {
                        "bbid": bbid,
                        "entity_type": "property",
                        "entity_key": entity_key,
                        "source": "nightsbridge",
                        "source_url": src,
                        "local_path": None,
                        "alt_text": label or f"Property image {i + 1}",
                        "width": img.get("w"),
                        "height": img.get("h"),
                        "is_primary": i == 0,
                        "sort_order": i,
                        "metadata": {"scrape_page": reached, "scrape_source": "webview_web_info"},
                        "updated_at": datetime.utcnow().isoformat(),
                    },
                )
                count += 1

        print(f"Stored {count} image URL(s) from NightsBridge webview ({len(matched_room_ids)} rooms matched).")
        return count
    finally:
        context.close()


def main() -> None:
    from playwright.sync_api import sync_playwright

    headless = os.environ.get("HEADLESS", "true").lower() == "true"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless, args=["--disable-dev-shm-usage", "--no-sandbox"])
        try:
            scrape_webview_images(browser)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
