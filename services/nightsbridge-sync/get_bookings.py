"""
Fetch upcoming bookings from the NightsBridge BridgeIt API and store them in Supabase.

Flow:
  1. Log in to NightsBridge via Playwright (saves session → storage_state.json).
  2. Extract the calendar loginkey from the dashboard URL.
  3. Call https://bridgeit.nightsbridge.com/bridgeitapi with BookingCalendarRQ.
  4. Parse bookings into a normalised list.
  5. Upsert into Supabase table `bookings`.

Run:
  python get_bookings.py              # next 60 days from today
  python get_bookings.py 2026-06-01 2026-09-30   # custom range

Env vars (in .env):
  SITE_USER, SITE_PASS    — NightsBridge login credentials
  SUPABASE_URL            — Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
"""

import json
import os
import sys
from datetime import datetime, timedelta
from typing import Any

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

import auth
import config

load_dotenv()
config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ─── Date range ─────────────────────────────────────────────────────────────

if len(sys.argv) >= 3:
    DATE_FROM = sys.argv[1]
    DATE_TO = sys.argv[2]
else:
    today = datetime.now()
    DATE_FROM = today.strftime("%Y-%m-%d")
    DATE_TO = (today + timedelta(days=int(os.environ.get("DAYS_AHEAD", "60")))).strftime("%Y-%m-%d")

print(f"Fetching bookings {DATE_FROM} → {DATE_TO}")


# ─── BridgeIt API helpers ─────────────────────────────────────────────────

def intercept_calendar_data(context, page, loginkey: str) -> list[dict[str, Any]]:
    """
    Navigate to the NightsBridge calendar page and intercept the BridgeIt API
    responses the page fires automatically.  Returns the raw booking list.
    """
    captured: list[dict[str, Any]] = []

    # Get the actual calendar link from the dashboard (its href has the right format)
    try:
        cal_href = page.get_attribute(config.CALENDAR_LINK, "href") or ""
    except Exception:
        cal_href = ""

    calendar_url = cal_href if cal_href.startswith("http") else \
        f"https://calendar.nightsbridge.com/?loginkey={loginkey}"

    cal_page = context.new_page()

    def on_response(resp):
        if "bridgeitapi" not in resp.url:
            return
        try:
            body = resp.json()
            req_text = resp.request.post_data or ""
            try:
                req_json = json.loads(req_text)
            except Exception:
                req_json = {}
            op = req_json.get("request", "?")
            print(f"  → intercepted: {op}  (status {resp.status})")
            captured.append({
                "url": resp.url,
                "request_type": op,
                "body": body,
            })
        except Exception as e:
            print(f"  → intercept parse error: {e}")

    cal_page.on("response", on_response)

    print(f"  Calendar URL: {calendar_url[:90]}…")
    try:
        # "commit" = fires as soon as response headers arrive — before JS runs.
        # We then wait explicitly for the XHRs the SPA fires.
        cal_page.goto(calendar_url, wait_until="commit", timeout=30_000)
    except Exception as e:
        print(f"  Calendar nav warning: {e}")
    # Wait up to 25 s for the SPA to boot and fire the bridgeitapi XHRs.
    cal_page.wait_for_timeout(25_000)

    cal_page.close()
    print(f"  Intercepted {len(captured)} bridgeitapi call(s).")
    return captured


def format_booking(b: dict[str, Any]) -> dict[str, Any]:
    """Normalise a raw BridgeIt booking dict into a flat record."""
    return {
        "booking_id":     b.get("bookingid") or b.get("bkid") or b.get("id"),
        "reference":      b.get("bookingreference") or b.get("reference") or b.get("bkref"),
        "status":         b.get("status") or b.get("bookingstatus"),
        "status_desc":    config.STATUS_CODES.get(
            (b.get("status") or b.get("bookingstatus") or "")[:1], "Unknown"
        ),
        "guest_name":     b.get("guestname") or f'{b.get("firstname", "")} {b.get("lastname", "")}'.strip(),
        "guest_email":    b.get("email") or b.get("guestemail"),
        "guest_phone":    b.get("cellno") or b.get("telephone"),
        "arrive":         b.get("arrive") or b.get("startdate") or b.get("checkin"),
        "depart":         b.get("depart") or b.get("enddate") or b.get("checkout"),
        "nights":         b.get("nights") or b.get("numberofnights"),
        "adults":         b.get("adults") or b.get("numberofadults"),
        "children":       b.get("children") or b.get("numberofchildren"),
        "room_name":      b.get("roomname") or b.get("room"),
        "room_type_name": b.get("roomtypename") or b.get("roomtype"),
        "total":          b.get("total") or b.get("totalamount") or b.get("grosstotal"),
        "deposit_paid":   b.get("depositpaid") or b.get("amountpaid"),
        "balance_due":    b.get("balancedue") or b.get("outstanding"),
        "source":         b.get("source") or b.get("bookedfrom"),
        "notes":          b.get("notes") or b.get("specialrequests"),
        "bbid":           int(os.environ.get("SITE_USER", "21091")),
        "raw_json":       json.dumps(b),
        "synced_at":      datetime.utcnow().isoformat() + "Z",
    }


# ─── Supabase upsert ─────────────────────────────────────────────────────────

def upsert_bookings(bookings: list[dict[str, Any]]) -> None:
    try:
        from supabase import create_client  # type: ignore

        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        sb = create_client(url, key)

        # Filter out rows where booking_id is None (can't upsert without PK)
        valid = [b for b in bookings if b.get("booking_id")]
        if not valid:
            print("No valid bookings to upsert (all missing booking_id)")
            return

        result = sb.table("bookings").upsert(
            valid,
            on_conflict="booking_id",
        ).execute()
        print(f"Supabase upsert: {len(valid)} bookings written.")
    except ImportError:
        print("supabase-py not installed — saving to output/bookings.json only")
    except Exception as e:
        print(f"Supabase error: {e}")


# ─── Main ────────────────────────────────────────────────────────────────────

with sync_playwright() as p:
    headless = os.environ.get("HEADLESS", "true").lower() == "true"
    browser = p.chromium.launch(headless=headless)

    context, page = auth.get_authenticated_context(browser)
    # auth already navigated to the dashboard — no need to goto again.
    # Just wait briefly for the Angular app to settle.
    page.wait_for_timeout(3_000)

    loginkey = auth.get_dashboard_loginkey(page)
    print(f"Loginkey: {loginkey[:10]}…{loginkey[-6:]}")

    # ── Navigate to calendar and intercept BridgeIt API responses ─────────
    print("\nLoading calendar to intercept booking data…")
    intercepted = intercept_calendar_data(context, page, loginkey)

    # Save all intercepted calls for debugging
    (config.OUTPUT_DIR / "bridgeit_calls.json").write_text(
        json.dumps(intercepted, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Saved raw intercepts → output/bridgeit_calls.json")

    # ── Extract bookings from any BookingCalendarRQ response ───────────────
    bookings_raw: list[dict[str, Any]] = []

    for call in intercepted:
        body = call.get("body", {})
        # Try known shapes
        for key in ("bookings", "data", "results", "items", "Bookings"):
            val = body.get(key) if isinstance(body, dict) else None
            if isinstance(val, list) and val:
                bookings_raw = val
                print(f"  Found bookings in '{key}' key ({len(val)} records)")
                break
        if bookings_raw:
            break
        # Sometimes data is nested under data.bookings
        if isinstance(body.get("data"), dict):
            for k, v in body["data"].items():
                if isinstance(v, list) and v:
                    bookings_raw = v
                    print(f"  Found bookings in 'data.{k}' ({len(v)} records)")
                    break
        if bookings_raw:
            break

    if not bookings_raw:
        print("  No bookings found in intercepted data.")
        print("  Check output/bridgeit_calls.json for raw API responses.")
        all_keys = [list(c.get("body", {}).keys())[:8] for c in intercepted]
        print(f"  Response key shapes: {all_keys}")

    print(f"\nTotal raw booking records: {len(bookings_raw)}")
    bookings = [format_booking(b) for b in bookings_raw]

    # ── Save normalised JSON ───────────────────────────────────────────────
    (config.OUTPUT_DIR / "bookings.json").write_text(
        json.dumps(bookings, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Saved {len(bookings)} bookings → output/bookings.json")

    # ── Upsert to Supabase ─────────────────────────────────────────────────
    upsert_bookings(bookings)

    # ── Print summary ──────────────────────────────────────────────────────
    print("\n── Booking summary ──")
    for b in bookings[:20]:
        print(
            f"  [{b.get('status','?')}] {b.get('guest_name','?'):30}"
            f"  {b.get('arrive','?')} → {b.get('depart','?')}"
            f"  {b.get('room_type_name','?')}"
        )
    if len(bookings) > 20:
        print(f"  … and {len(bookings) - 20} more")

    browser.close()
