"""
One-off helper: capture every POST to bridgeitapi with its request payload AND
response, so we can identify which call returns booking data. Reads only.

    python explore_api.py
"""

import json

from playwright.sync_api import sync_playwright

import config

calls = []  # list of {request_payload, response}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(storage_state=str(config.STATE_FILE))
    page = context.new_page()
    page.set_default_timeout(config.TIMEOUT_MS)

    def on_response(resp):
        if "bridgeitapi" not in resp.url:
            return
        try:
            payload = resp.request.post_data
            try:
                payload = json.loads(payload)
            except Exception:
                pass
            calls.append({
                "url": resp.url,
                "request": payload,
                "response": resp.json(),
            })
        except Exception as e:
            calls.append({"url": resp.url, "error": str(e)})

    page.on("response", on_response)

    page.goto("https://www.nightsbridge.com/dashboard/home", wait_until="networkidle")
    href = page.get_attribute("a:has-text('Go to Calendar')", "href")
    page.goto(href, wait_until="networkidle")
    page.wait_for_timeout(6000)

    print(f"Captured {len(calls)} bridgeitapi call(s).\n")
    for i, c in enumerate(calls):
        req = c.get("request")
        # Try to surface the operation name from the request payload.
        op = None
        if isinstance(req, dict):
            for k in ("method", "action", "request", "type", "operation", "name"):
                if k in req:
                    op = (k, req[k])
                    break
        resp = c.get("response", {})
        data = resp.get("data") if isinstance(resp, dict) else None
        if isinstance(data, list):
            dshape = f"list[{len(data)}]"
        elif isinstance(data, dict):
            dshape = f"dict keys={list(data.keys())[:10]}"
        else:
            dshape = type(data).__name__
        print(f"[{i}] op={op}")
        print(f"    request={json.dumps(req, ensure_ascii=False)[:220]}")
        print(f"    data -> {dshape}\n")

    (config.OUTPUT_DIR / "bridgeit_calls.json").write_text(
        json.dumps(calls, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("Saved full request/response pairs -> output/bridgeit_calls.json")

    browser.close()
