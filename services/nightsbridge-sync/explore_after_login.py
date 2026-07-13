"""
One-off helper: log in with your .env credentials and map what's behind it.

Prints the post-login URL, the page title, every navigation link (text + href),
and saves a screenshot to output/after_login.png plus the rendered HTML to
output/after_login.html — so we can pick the right DATA_URL and selectors.

Run:  python explore_after_login.py
Nothing here is destructive: it only reads pages.
"""

import os

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

import config

load_dotenv()
config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    headless = os.environ.get("HEADLESS", "true").lower() == "true"
    browser = p.chromium.launch(headless=headless, args=["--disable-dev-shm-usage", "--no-sandbox"])
    context = browser.new_context()
    page = context.new_page()
    page.set_default_timeout(config.TIMEOUT_MS)

    # Self-contained login: we don't know the post-login indicator yet, so we
    # treat the password field disappearing as the signal that login worked.
    print("Logging in...")
    page.goto(config.LOGIN_URL, wait_until="networkidle")
    page.fill(config.LOGIN_SELECTORS["username"], os.environ["SITE_USER"])
    page.fill(config.LOGIN_SELECTORS["password"], os.environ["SITE_PASS"])
    page.click(config.LOGIN_SELECTORS["submit"])
    try:
        page.wait_for_selector("input[type='password']", state="detached", timeout=30000)
        print("Login form gone -> login looks successful.")
    except Exception:
        print("!! Password field still present after 30s. Wrong creds, or an "
              "extra step (2FA / property pick / error message)?")
    page.wait_for_load_state("networkidle")

    # Persist the session so later runs can skip the login.
    context.storage_state(path=str(config.STATE_FILE))

    print("POST-LOGIN URL:", page.url)
    print("TITLE:", page.title())

    print("\n=== NAV LINKS (text -> href) ===")
    seen = set()
    for el in page.query_selector_all("a[href]"):
        text = (el.inner_text() or "").strip().replace("\n", " ")
        href = el.get_attribute("href")
        key = (text, href)
        if text and key not in seen:
            seen.add(key)
            print(f"  {text!r:40}  {href}")

    print("\n=== BUTTONS ===")
    for el in page.query_selector_all("button"):
        text = (el.inner_text() or "").strip().replace("\n", " ")
        if text:
            print(f"  {text!r}")

    print("\n=== TABLES / repeating structures ===")
    print("  <table> count:", len(page.query_selector_all("table")))
    print("  <tr> count   :", len(page.query_selector_all("tr")))

    page.screenshot(path=str(config.OUTPUT_DIR / "after_login.png"), full_page=True)
    (config.OUTPUT_DIR / "after_login.html").write_text(page.content(), encoding="utf-8")
    print("\nSaved screenshot -> output/after_login.png")
    print("Saved HTML       -> output/after_login.html")

    browser.close()
