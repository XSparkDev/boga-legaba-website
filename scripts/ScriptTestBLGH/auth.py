"""
Login + session persistence for NightsBridge.

First run: log in via the website and save the session (cookies) to
storage_state.json. Later runs: reuse it and skip the login. If the saved
session has expired, we detect it (dashboard bounces us to the login page) and
log in again.
"""

import os
import re
import sys
from typing import Optional

import config

_LOGINKEY_RE = re.compile(r"/loginkey/(?:home/)?([a-f0-9]{64,128})", re.I)


def _loginkey_from_url(url: str) -> Optional[str]:
    match = _LOGINKEY_RE.search(url)
    return match.group(1) if match else None


def _is_logged_in(page) -> bool:
    """True if the dashboard shows a calendar link or embeds a loginkey in the URL."""
    if _loginkey_from_url(page.url):
        return True
    try:
        page.wait_for_selector(config.CALENDAR_LINK, timeout=8_000, state="attached")
        return True
    except Exception:
        return False


def _perform_login(page) -> None:
    """Fill and submit the login form using credentials from the environment."""
    user = os.environ.get("NB_USERNAME") or os.environ.get("SITE_USER")
    password = os.environ.get("NB_PASSWORD") or os.environ.get("SITE_PASS")
    if not user or not password:
        raise RuntimeError(
            "NB_USERNAME / NB_PASSWORD (or SITE_USER / SITE_PASS) not set. "
            "Copy .env.example to .env and fill them in."
        )

    print("Logging in...", file=sys.stderr)
    # domcontentloaded, NOT networkidle: NightsBridge's Angular app keeps
    # background requests running, so networkidle never settles and burns the
    # full timeout. page.fill() below auto-waits for the inputs to be
    # actionable, so we lose no reliability by not waiting for network-idle.
    page.goto(config.LOGIN_URL, wait_until="domcontentloaded", timeout=config.TIMEOUT_MS)
    page.fill(config.LOGIN_SELECTORS["username"], user)
    page.fill(config.LOGIN_SELECTORS["password"], password)
    page.click(config.LOGIN_SELECTORS["submit"])

    # Wait for redirect to dashboard (new UI lands on /dashboard/loginkey/home/…).
    try:
        page.wait_for_url("**/dashboard/**", timeout=config.TIMEOUT_MS)
    except Exception:
        page.wait_for_timeout(5_000)

    if not _is_logged_in(page):
        raise RuntimeError(
            "Login did not complete. Check your credentials, or the site may have "
            "added a step (2FA / property picker / an error message)."
        )
    print("Login successful.", file=sys.stderr)


def get_authenticated_context(browser):
    """
    Return (context, page) that is logged in, reusing a saved session if valid.
    """
    if config.STATE_FILE.exists():
        context = browser.new_context(storage_state=str(config.STATE_FILE))
        page = context.new_page()
        # domcontentloaded (not networkidle) — _is_logged_in() below does an
        # explicit wait_for_selector on the calendar link, so it already waits
        # for the real "logged in" signal. Waiting for network-idle first just
        # adds seconds of dead time on this always-busy SPA.
        page.goto(config.DASHBOARD_URL, wait_until="domcontentloaded", timeout=config.TIMEOUT_MS)
        if _is_logged_in(page):
            print("Reusing saved session.", file=sys.stderr)
            return context, page
        print("Saved session expired - logging in again.", file=sys.stderr)
    else:
        context = browser.new_context()
        page = context.new_page()

    _perform_login(page)
    context.storage_state(path=str(config.STATE_FILE))
    return context, page


def get_dashboard_loginkey(page) -> str:
    """Read the calendar loginkey from the dashboard URL or 'Go to Calendar' link."""
    key = _loginkey_from_url(page.url)
    if key:
        return key

    if config.CALENDAR_LINK and "dashboard" not in page.url:
        page.goto(config.DASHBOARD_URL, wait_until="networkidle", timeout=config.TIMEOUT_MS)
        key = _loginkey_from_url(page.url)
        if key:
            return key

    href = page.get_attribute(config.CALENDAR_LINK, "href")
    if href and "/loginkey/" in href:
        return href.split("/loginkey/", 1)[1].split("?")[0].split("/")[-1]

    raise RuntimeError(f"Could not find the calendar loginkey (url={page.url!r})")
