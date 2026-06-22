"""
Intercept ALL XHR/fetch requests on the public NightsBridge booking widget
and print any that look like availability or room-type data.

No login required — targets the public booking page.

Usage:
    cd public/ScriptTestBLGH
    python3 find_api.py
"""

from playwright.sync_api import sync_playwright
import json
import os
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

URL = "https://book.nightsbridge.com/21091?arrive=2026-06-20&depart=2026-06-22"

KEYWORDS = ["avail", "21091", "bridgeit", "nightsbridge", "property", "roomtype",
            "room_type", "rates", "pricing", "grid", "calendar"]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    captured_requests = []
    captured_responses = []

    def handle_request(request):
        url = request.url
        if any(x in url.lower() for x in KEYWORDS):
            captured_requests.append({
                "url": url,
                "method": request.method,
                "headers": dict(request.headers),
                "post_data": request.post_data,
            })

    def handle_response(response):
        url = response.url
        # Capture JSON responses from any NightsBridge subdomain
        if "nightsbridge" not in url.lower():
            return
        content_type = response.headers.get("content-type", "")
        if "json" not in content_type and "javascript" not in content_type:
            return
        try:
            body = response.json()
            info = {"url": url, "status": response.status, "body": body}
            captured_responses.append(info)
            print(f"\n=== RESPONSE: {url} ===")
            print(f"Status: {response.status}")
            print(json.dumps(body, indent=2)[:2000])
        except Exception as e:
            # Not JSON — print raw text for small responses
            try:
                text = response.text()
                if len(text) < 5000 and any(x in url.lower() for x in KEYWORDS):
                    print(f"\n=== TEXT RESPONSE: {url} ===")
                    print(text[:2000])
            except Exception:
                pass

    page.on("request", handle_request)
    page.on("response", handle_response)

    print(f"Navigating to: {URL}")
    try:
        page.goto(URL, wait_until="networkidle", timeout=60_000)
    except Exception as e:
        print(f"WARNING: {e} — continuing...")

    # Extra wait to catch lazy-loaded XHR
    page.wait_for_timeout(5_000)

    print("\n\n" + "=" * 60)
    print("ALL CAPTURED REQUEST URLS:")
    print("=" * 60)
    for r in captured_requests:
        print(f"  [{r['method']}] {r['url']}")
        if r.get("post_data"):
            print(f"       POST data: {str(r['post_data'])[:300]}")

    print("\n" + "=" * 60)
    print(f"TOTAL: {len(captured_requests)} matching requests, {len(captured_responses)} JSON responses")

    # Save everything to output/
    out = {
        "page_url": URL,
        "requests": captured_requests,
        "responses": captured_responses,
    }
    out_path = OUTPUT_DIR / "api_urls.txt"
    out_path.write_text(
        "\n".join(
            [f"[{r['method']}] {r['url']}" for r in captured_requests]
        ),
        encoding="utf-8",
    )
    (OUTPUT_DIR / "find_api_full.json").write_text(
        json.dumps(out, indent=2, default=str), encoding="utf-8"
    )
    print(f"\nSaved URL list → {out_path}")
    print(f"Saved full JSON → {OUTPUT_DIR / 'find_api_full.json'}")

    browser.close()
