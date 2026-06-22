"""
NightsBridge bookings scraper.

    log in  ->  read loginkey  ->  bootstrap  ->  fetch bookings  ->  save

Date range comes from .env (DATE_FROM / DATE_TO, YYYY-MM-DD). If unset, it
defaults to today through today + DEFAULT_DAYS_AHEAD.

Run:  python main.py
"""

import os
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

import auth
import config
import nightsbridge
import storage
import transform

# Local scraper .env (optional, git-ignored) then repo-root .env.local (SITE_USER + Supabase).
# Do NOT put .env in public/ — Next.js serves static files from public/.
load_dotenv()
_root_env = Path(__file__).resolve().parents[2] / ".env.local"
if _root_env.exists():
    load_dotenv(_root_env, override=False)


def _date_range() -> tuple[str, str]:
    start = os.environ.get("DATE_FROM") or date.today().isoformat()
    end = os.environ.get("DATE_TO") or (
        date.today() + timedelta(days=config.DEFAULT_DAYS_AHEAD)
    ).isoformat()
    return start, end


def _attempt(browser, start: str, end: str):
    """One full fetch with whatever session currently exists."""
    context, page = auth.get_authenticated_context(browser)
    try:
        dashboard_key = auth.get_dashboard_loginkey(page)
        session_key = nightsbridge.get_session_loginkey(context, dashboard_key)
        data = nightsbridge.fetch_booking_calendar(context, session_key, start, end)
        records = transform.flatten_bookings(data)
        return data, records, len(data.get("bookings", []))
    finally:
        context.close()


def main() -> None:
    load_dotenv()
    headless = os.environ.get("HEADLESS", "true").lower() == "true"
    start, end = _date_range()
    print(f"Fetching bookings from {start} to {end}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        try:
            try:
                data, records, n_bookings = _attempt(browser, start, end)
            except nightsbridge.SessionExpired:
                # Saved session was stale: drop it and log in fresh, once.
                print("Saved session was stale - logging in fresh.")
                config.STATE_FILE.unlink(missing_ok=True)
                data, records, n_bookings = _attempt(browser, start, end)

            print(f"Extracted {len(records)} room-stay row(s) "
                  f"from {n_bookings} booking(s).")
            storage.save_json(records)
            storage.save_csv(records)

            if os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
                storage.sync_to_supabase(data, start, end)
                try:
                    import images as nb_images
                    nb_images.scrape_webview_images(browser)
                except Exception as exc:
                    print(f"Webview image scrape skipped: {exc}")
            elif os.environ.get("NEXT_PUBLIC_SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
                os.environ.setdefault(
                    "SUPABASE_URL",
                    os.environ["NEXT_PUBLIC_SUPABASE_URL"].replace("/rest/v1/", "").rstrip("/"),
                )
                storage.sync_to_supabase(data, start, end)
                try:
                    import images as nb_images
                    nb_images.scrape_webview_images(browser)
                except Exception as exc:
                    print(f"Webview image scrape skipped: {exc}")
            else:
                print("Supabase env not set — skipped DB sync (CSV/JSON only).")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
