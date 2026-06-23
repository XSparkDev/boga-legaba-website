"""
Playwright automation: submits a guest booking on https://book.nightsbridge.com/21091.

Usage:
  python book_nightsbridge.py --params '{"checkin":"2026-07-01","checkout":"2026-07-02",...}'

Required params:
  checkin, checkout      YYYY-MM-DD
  roomTypeName           Exact NightsBridge room type name e.g. "Double Room (Shower)"
  mealPlanName           "Room Only" | "Bed & Breakfast" | "Dinner, Bed & Breakfast"
  firstname, surname     Guest name
  phone                  Include country code e.g. +27821234567
  email                  Guest email

Optional params:
  adults         (int, default 2)
  children1      (int, 0–5 yrs free, default 0)
  children2      (int, 6–12 yrs, default 0)
  arrivalTime    HH:MM
  airline        Airline name (if applicable)
  flightno       Flight number (if applicable)
  notes          Special requests
  paymentMethod  "bank_transfer" (default) | "credit_card"
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time

from playwright.sync_api import sync_playwright

NB_BBID = 21091
NB_BASE = f"https://book.nightsbridge.com/{NB_BBID}"


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def book_room(params: dict) -> dict:
    checkin      = params["checkin"]
    checkout     = params["checkout"]
    room_type    = params["roomTypeName"]
    meal_plan    = params["mealPlanName"]
    adults          = int(params.get("adults", 2))
    children1       = int(params.get("children1", 0))
    children2       = int(params.get("children2", 0))
    firstname       = params["firstname"]
    surname         = params["surname"]
    phone           = params["phone"]
    email           = params["email"]
    arrival_time    = params.get("arrivalTime", "")
    airline         = params.get("airline", "")
    flightno        = params.get("flightno", "")
    notes           = params.get("notes", "")
    payment_method  = params.get("paymentMethod", "bank_transfer")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
        )
        page = context.new_page()

        try:
            # ── Step 1: Load booking page with dates pre-filled ──────────
            url = f"{NB_BASE}?arrive={checkin}&depart={checkout}"
            page.goto(url, wait_until="networkidle", timeout=35_000)
            time.sleep(4)

            # ── Step 2: Find room card and click VIEW RATES AND BOOK ──────
            clicked = _click_view_rates(page, room_type)
            if not clicked:
                # Dump visible room names to help diagnose mismatches
                visible = _list_visible_room_types(page)
                return {
                    "ok": False,
                    "error": (
                        f"Room type '{room_type}' not found on the NightsBridge booking page. "
                        f"Visible room types: {visible or '(none detected)'}"
                    ),
                }
            time.sleep(4)

            # ── Step 3: Click BOOK NOW for the selected meal plan ─────────
            clicked_mp = _click_book_now(page, meal_plan)
            if not clicked_mp:
                return {
                    "ok": False,
                    "error": f"Meal plan '{meal_plan}' not found",
                }
            time.sleep(5)

            # ── Step 4: Fill guest form ────────────────────────────────────
            _fill_guest_form(
                page, adults, children1, children2,
                firstname, surname, phone, email,
                arrival_time, airline, flightno, notes,
            )
            time.sleep(1)

            # ── Step 5: Select payment method ─────────────────────────────
            _select_payment(page, payment_method)
            time.sleep(0.5)

            # ── Step 6: Accept T&Cs ───────────────────────────────────────
            _accept_tcs(page)
            time.sleep(0.5)

            # ── Step 7: Submit ────────────────────────────────────────────
            submitted = _submit_booking(page)
            if not submitted:
                return {
                    "ok": False,
                    "error": "Could not find the submit/confirm button on the booking form",
                }
            time.sleep(12)

            # ── Step 8: Analyse result page ───────────────────────────────
            page_url = page.url
            page_text = page.evaluate("() => document.body.innerText")

            # Detect redirect to a payment gateway (3DS / Peach Payments etc.)
            payment_domains = ("peach", "paygate", "3dsecure", "cybersource",
                               "payfast", "ozow", "dpo", "payu")
            if any(d in page_url.lower() for d in payment_domains):
                return {
                    "ok": False,
                    "error": (
                        "NightsBridge redirected to a card payment gateway. "
                        "Please use Bank Transfer or book directly on NightsBridge."
                    ),
                }

            # Detect NightsBridge error messages on the page
            text_lower = page_text.lower()
            error_phrases = [
                "not available", "no rooms available", "fully booked",
                "sold out", "no availability", "booking failed",
                "we were unable", "cannot be booked",
            ]
            booking_ref = _extract_booking_ref(page_text)
            if not booking_ref and any(p in text_lower for p in error_phrases):
                return {
                    "ok": False,
                    "error": "NightsBridge indicated no availability for these dates. " + page_text[:300],
                }

            return {
                "ok": True,
                "bookingRef": booking_ref,
                "confirmationText": page_text[:1500],
            }

        except Exception as exc:
            try:
                page.screenshot(path="/tmp/booking_error.png")
            except Exception:
                pass
            return {"ok": False, "error": str(exc)}

        finally:
            browser.close()


# ---------------------------------------------------------------------------
# Playwright helpers
# ---------------------------------------------------------------------------

def _list_visible_room_types(page) -> list[str]:
    """Return room type names visible on the page — used in error messages for diagnosis."""
    try:
        return page.evaluate(
            """() => {
                const buttons = Array.from(document.querySelectorAll('button.btn-show-rates'));
                const names = [];
                for (const btn of buttons) {
                    let el = btn;
                    for (let i = 0; i < 12; i++) {
                        if (!el.parentElement) break;
                        el = el.parentElement;
                        const h = el.querySelector('h2,h3,h4,[class*="title"],[class*="name"]');
                        if (h && h.innerText?.trim()) {
                            names.push(h.innerText.trim());
                            break;
                        }
                    }
                }
                return [...new Set(names)];
            }"""
        )
    except Exception:
        return []


def _click_view_rates(page, room_type_name: str) -> bool:
    """Find the room card matching room_type_name and click its VIEW RATES AND BOOK button."""
    return page.evaluate(
        """(roomTypeName) => {
            const buttons = Array.from(document.querySelectorAll('button.btn-show-rates'));
            for (const btn of buttons) {
                let el = btn;
                for (let i = 0; i < 12; i++) {
                    if (!el.parentElement) break;
                    el = el.parentElement;
                    if ((el.innerText || '').includes(roomTypeName)) {
                        btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                        btn.click();
                        return true;
                    }
                }
            }
            return false;
        }""",
        room_type_name,
    )


def _click_book_now(page, meal_plan_name: str) -> bool:
    """Find the meal plan section and click its BOOK NOW button."""
    return page.evaluate(
        """(mealPlanName) => {
            const mpLower = mealPlanName.toLowerCase();
            const bookBtns = Array.from(document.querySelectorAll('button')).filter(
                b => b.innerText?.trim().toUpperCase() === 'BOOK NOW'
            );
            for (const btn of bookBtns) {
                let el = btn;
                for (let i = 0; i < 7; i++) {
                    if (!el.parentElement) break;
                    el = el.parentElement;
                    if ((el.innerText || '').toLowerCase().includes(mpLower)) {
                        // Set quantity to 1 in this section
                        const inp = el.querySelector('input[name="rates-c2"]');
                        if (inp) {
                            const setter = Object.getOwnPropertyDescriptor(
                                window.HTMLInputElement.prototype, 'value'
                            ).set;
                            setter.call(inp, '1');
                            inp.dispatchEvent(new Event('input', { bubbles: true }));
                            inp.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        btn.click();
                        return true;
                    }
                }
            }
            return false;
        }""",
        meal_plan_name,
    )


def _ng_set(page, name: str, value: str) -> None:
    """Set an Angular-controlled number input using the native value setter."""
    page.evaluate(
        """([name, value]) => {
            const inp = document.querySelector(`input[name="${name}"]`);
            if (!inp) return;
            const setter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
            ).set;
            setter.call(inp, value);
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
        }""",
        [name, value],
    )


def _fill_guest_form(
    page,
    adults: int,
    children1: int,
    children2: int,
    firstname: str,
    surname: str,
    phone: str,
    email: str,
    arrival_time: str,
    airline: str,
    flightno: str,
    notes: str,
) -> None:
    # Pax counts
    _ng_set(page, "adult-c1", str(adults))
    if children1:
        _ng_set(page, "child1-c1", str(children1))
    if children2:
        _ng_set(page, "child2-c1", str(children2))
    time.sleep(0.5)

    # Text inputs — Playwright fill triggers Angular reactive-form events
    for name, val in [
        ("firstname", firstname),
        ("surname", surname),
        ("phoneno", phone),
        ("email", email),
        ("emailverify", email),   # NightsBridge requires email confirmation
        ("airline", airline),
        ("flightno", flightno),
    ]:
        if val:
            loc = page.locator(f'input[name="{name}"]').first
            if loc.count():
                loc.fill(str(val))

    if arrival_time:
        loc = page.locator('input[name="arrivaltime"]').first
        if loc.count():
            loc.fill(arrival_time)

    if notes:
        loc = page.locator('textarea[name="notes"]').first
        if loc.count():
            loc.fill(notes)


def _select_payment(page, method: str = "bank_transfer") -> None:
    value = "1" if method == "bank_transfer" else "2"
    page.evaluate(
        """(value) => {
            const radios = document.querySelectorAll('input[type="radio"]');
            for (const r of radios) {
                if (r.value === value) {
                    r.click();
                    r.checked = true;
                    r.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
                }
            }
        }""",
        value,
    )


def _accept_tcs(page) -> None:
    tcs = page.locator('input[name="tcs"]').first
    if tcs.count() and not tcs.is_checked():
        tcs.check()


def _submit_booking(page) -> str:
    result = page.evaluate(
        """() => {
            // 1. Prefer type=submit
            const s = document.querySelector('button[type="submit"]:not([disabled])');
            if (s) { s.click(); return s.innerText.trim(); }
            // 2. Match by text
            const texts = [
                'CONFIRM BOOKING', 'CONFIRM', 'COMPLETE BOOKING',
                'PLACE BOOKING', 'SUBMIT', 'BOOK',
            ];
            for (const txt of texts) {
                const btn = Array.from(document.querySelectorAll('button')).find(
                    b => b.innerText?.trim().toUpperCase() === txt && !b.disabled
                );
                if (btn) { btn.click(); return btn.innerText.trim(); }
            }
            return '';
        }"""
    )
    return result or ""


def _extract_booking_ref(text: str) -> str | None:
    patterns = [
        # NightsBridge bbid-prefixed refs e.g. "21091-12345"
        r'\b(21091-\d+)\b',
        # Explicit booking reference label
        r'[Bb]ooking\s+[Rr]ef(?:erence)?[:\s#]+([A-Z0-9\-]{4,20})',
        r'[Cc]onfirmation\s+[Nn](?:umber|o\.?)[:\s#]+([A-Z0-9\-]{4,20})',
        r'[Bb]ooking\s+[Nn](?:umber|o\.?)[:\s#]+([A-Z0-9\-]{4,20})',
        r'[Rr]eference\s+[Nn](?:umber|o\.?)[:\s#]+([A-Z0-9\-]{4,20})',
        # Short "Ref:" label
        r'\bRef[:\s]+([A-Z0-9\-]{4,16})\b',
        # NightsBridge sometimes shows "Your booking number is XXXXX"
        r'booking\s+(?:number|ref)\s+(?:is\s+)?([A-Z0-9\-]{4,20})',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1)
    return None


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Book a NightsBridge room via Playwright")
    parser.add_argument("--params", required=True, help="JSON booking params")
    args = parser.parse_args()
    params = json.loads(args.params)
    result = book_room(params)
    print(json.dumps(result))
    sys.exit(0 if result.get("ok") else 1)
