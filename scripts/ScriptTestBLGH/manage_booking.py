"""
NightsBridge admin actions: check in, check out.

Logs into the NightsBridge admin dashboard, navigates to the specific booking,
and performs the requested action. This is used by the Boga Legaba admin panel
so property staff don't have to switch to NightsBridge to do common tasks.

Usage:
  python manage_booking.py --booking-ref 12345 --action checkin
  python manage_booking.py --booking-ref 12345 --action checkout

Env: SITE_USER, SITE_PASS (NightsBridge admin credentials)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright

NB_LOGIN_URL = "https://login.nightsbridge.com/"
NB_DASHBOARD = "https://www.nightsbridge.com/dashboard"


def _login(page) -> bool:
    user = os.environ.get("SITE_USER") or os.environ.get("NB_USERNAME")
    pwd  = os.environ.get("SITE_PASS") or os.environ.get("NB_PASSWORD")
    if not user or not pwd:
        return False
    page.goto(NB_LOGIN_URL, wait_until="networkidle", timeout=30_000)
    page.fill("input[type='text']",     user)
    page.fill("input[type='password']", pwd)
    page.click("button.btn-primary")
    try:
        page.wait_for_url("**/dashboard/**", timeout=30_000)
    except Exception:
        page.wait_for_timeout(5_000)
    return "/dashboard" in page.url


def _click_first(page, selectors: list[str]) -> str | None:
    """Try each selector in order; click the first visible one. Returns matched selector."""
    for sel in selectors:
        try:
            loc = page.locator(sel).first
            if loc.count() and loc.is_visible(timeout=2_000):
                loc.click()
                return sel
        except Exception:
            continue
    return None


def perform_action(booking_ref: str | int, action: str) -> dict:
    """
    action: "checkin" | "checkout"
    Returns {"ok": True/False, "message": "...", "nbUrl": "..."}
    """
    ref = str(booking_ref)
    booking_url = f"{NB_DASHBOARD}/booking/{ref}"

    headless = os.environ.get("HEADLESS", "true").lower() == "true"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
        )
        page = context.new_page()

        try:
            print(f"[manage_booking] Logging in for {action} on booking {ref}...")
            if not _login(page):
                return {
                    "ok": False,
                    "error": "Login failed — check SITE_USER/SITE_PASS env vars",
                }

            print(f"[manage_booking] Navigating to {booking_url}")
            page.goto(booking_url, wait_until="networkidle", timeout=30_000)
            time.sleep(2)

            if action == "checkin":
                matched = _click_first(page, [
                    "button:has-text('Check In')",
                    "button:has-text('CHECK IN')",
                    "button:has-text('Arrival')",
                    "button:has-text('ARRIVAL')",
                    "a:has-text('Check In')",
                    "[data-action='checkin']",
                    "[class*='btn-checkin']",
                ])
                if not matched:
                    return {
                        "ok": False,
                        "error": (
                            "Check In button not found — the guest may already be checked in, "
                            "or the booking status doesn't allow check-in yet."
                        ),
                        "nbUrl": booking_url,
                    }

                time.sleep(3)
                # Confirm any modal that appears (e.g. "Are you sure?")
                _click_first(page, [
                    "button:has-text('Confirm')",
                    "button:has-text('Yes')",
                    "button:has-text('OK')",
                ])
                time.sleep(2)

                return {
                    "ok": True,
                    "message": f"Guest checked in on NightsBridge (booking {ref})",
                    "nbUrl": booking_url,
                }

            elif action == "checkout":
                matched = _click_first(page, [
                    "button:has-text('Check Out')",
                    "button:has-text('CHECK OUT')",
                    "button:has-text('Departure')",
                    "button:has-text('DEPARTURE')",
                    "button:has-text('Checkout')",
                    "a:has-text('Check Out')",
                    "[data-action='checkout']",
                    "[class*='btn-checkout']",
                ])
                if not matched:
                    return {
                        "ok": False,
                        "error": (
                            "Check Out button not found — the guest may not be checked in yet, "
                            "or they have already checked out."
                        ),
                        "nbUrl": booking_url,
                    }

                time.sleep(3)
                _click_first(page, [
                    "button:has-text('Confirm')",
                    "button:has-text('Yes')",
                    "button:has-text('OK')",
                ])
                time.sleep(2)

                return {
                    "ok": True,
                    "message": f"Guest checked out on NightsBridge (booking {ref})",
                    "nbUrl": booking_url,
                }

            else:
                return {"ok": False, "error": f"Unknown action: {action}"}

        except Exception as exc:
            try:
                page.screenshot(path=f"/tmp/manage_booking_error.png")
            except Exception:
                pass
            return {"ok": False, "error": str(exc), "nbUrl": booking_url}

        finally:
            browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NightsBridge admin booking actions")
    parser.add_argument("--booking-ref", required=True, help="NightsBridge booking reference number")
    parser.add_argument("--action", required=True, choices=["checkin", "checkout"])
    args = parser.parse_args()

    result = perform_action(args.booking_ref, args.action)
    print(json.dumps(result))
    sys.exit(0 if result.get("ok") else 1)
