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
                page, checkin, checkout,
                adults, children1, children2,
                firstname, surname, phone, email,
                arrival_time, airline, flightno, notes,
            )
            time.sleep(1.5)

            # ── Step 4b: Check NightsBridge occupancy validation ──────────
            occupancy_err = _check_occupancy_error(page)
            if occupancy_err:
                return {"ok": False, "error": occupancy_err}

            # ── Step 5: Select payment method ─────────────────────────────
            _select_payment(page, payment_method)
            time.sleep(1)

            # ── Step 6: Accept T&Cs ───────────────────────────────────────
            _accept_tcs(page)
            time.sleep(1.5)  # give Angular form validation time to re-evaluate

            # ── Step 7: Submit ────────────────────────────────────────────
            submitted = _submit_booking(page)
            if not submitted:
                return {
                    "ok": False,
                    "error": "Could not find the submit/confirm button on the booking form",
                }

            # Give Angular time to validate and navigate after submit, then wait for result
            time.sleep(3)
            _wait_for_result(page, timeout_ms=25_000)

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

            # Require clear confirmation signals — "reference" excluded as it appears on the form page
            confirmation_keywords = ["confirmed", "thank you", "booking number", "booking id"]
            has_confirmation = booking_ref or any(kw in text_lower for kw in confirmation_keywords)
            if not has_confirmation:
                try:
                    page.screenshot(path="/tmp/booking_no_confirm.png")
                except Exception:
                    pass
                return {
                    "ok": False,
                    "error": (
                        "The booking form was not accepted by NightsBridge — "
                        "terms & conditions may not have been checked or the payment method was not selected. "
                        "Please try again. If this repeats, contact the property directly."
                    ),
                }

            confirmation = _parse_confirmation(page)
            try:
                page.screenshot(path="/tmp/booking_confirmed.png")
            except Exception:
                pass
            return {
                "ok": True,
                "bookingRef": booking_ref,
                "confirmation": confirmation,
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
                            // Strip any trailing 'Close' text from dismiss buttons inside the heading
                            const name = h.innerText.trim().replace(/\\s*Close\\s*$/i, '').trim();
                            if (name) names.push(name);
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
    """Find the room card matching room_type_name and click its VIEW RATES AND BOOK button.

    Pass 1: exact substring match (fastest, most precise).
    Pass 2: strip the parenthetical variant suffix (e.g. '(Bath & Shower)') from the
            search term and match on the base name — handles cases where NightsBridge
            lists 'Twin Room (Shower)' but our catalogue says 'Twin Room (Bath & Shower)'.
    """
    return page.evaluate(
        """(roomTypeName) => {
            // Normalise: strip trailing 'Close' text that NightsBridge injects into headings
            function normalise(text) {
                return (text || '').replace(/\\s*Close\\s*$/i, '').trim();
            }
            // Base name: everything before the first '(' — used as fallback
            const baseName = roomTypeName.replace(/\\s*\\(.*$/, '').trim().toLowerCase();

            const buttons = Array.from(document.querySelectorAll('button.btn-show-rates'));

            // Pass 1: exact match
            for (const btn of buttons) {
                let el = btn;
                for (let i = 0; i < 12; i++) {
                    if (!el.parentElement) break;
                    el = el.parentElement;
                    if (normalise(el.innerText).toLowerCase().includes(roomTypeName.toLowerCase())) {
                        btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                        btn.click();
                        return true;
                    }
                }
            }

            // Pass 2: scored best-match on the room heading only (not full card text).
            // Extracts each room's heading, scores it by how many words from the
            // requested name appear in it, and picks the highest-scoring heading.
            // Ties broken by heading length (shorter = more specific = better).
            if (baseName) {
                const reqWords = roomTypeName.toLowerCase()
                    .replace(/[()&,+]/g, ' ').split(/\\s+/).filter(Boolean);
                const candidates = [];

                for (const btn of buttons) {
                    let el = btn;
                    for (let i = 0; i < 12; i++) {
                        if (!el.parentElement) break;
                        el = el.parentElement;
                        const h = el.querySelector('h2,h3,h4,[class*="title"],[class*="name"]');
                        if (h && h.innerText?.trim()) {
                            const headingName = normalise(h.innerText).toLowerCase();
                            if (headingName.includes(baseName)) {
                                const score = reqWords.filter(w => headingName.includes(w)).length;
                                candidates.push({ btn, score, len: headingName.length });
                            }
                            break;
                        }
                    }
                }

                if (candidates.length > 0) {
                    // highest score first; ties → prefer shorter (more specific) heading
                    candidates.sort((a, b) => b.score - a.score || a.len - b.len);
                    const best = candidates[0];
                    best.btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                    best.btn.click();
                    return true;
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
    """Set any Angular-controlled input using the native value setter.

    Playwright's fill() sets the visible text but bypasses Angular's reactive-form
    change detection.  Using the native HTMLInputElement setter + dispatching both
    'input' and 'change' forces Angular to register the new value in its model.
    Works for both <input> and <textarea> elements.
    """
    page.evaluate(
        """([name, value]) => {
            const el = document.querySelector(`[name="${name}"]`);
            if (!el) return;
            const tag = el.tagName.toLowerCase();
            const proto = tag === 'textarea'
                ? window.HTMLTextAreaElement.prototype
                : window.HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
            setter.call(el, value);
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
        }""",
        [name, value],
    )


def _fill_guest_form(
    page,
    checkin: str,
    checkout: str,
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
    # Re-set dates — NightsBridge's Angular SPA may reset arrive/depart to today
    # when navigating between booking steps, ignoring the original URL params.
    _ng_set(page, "arrive", checkin)
    _ng_set(page, "depart", checkout)
    time.sleep(0.3)

    # Pax counts
    _ng_set(page, "adult-c1", str(adults))
    if children1:
        _ng_set(page, "child1-c1", str(children1))
    if children2:
        _ng_set(page, "child2-c1", str(children2))
    time.sleep(0.5)

    # Text inputs — use _ng_set (native Angular setter) so the reactive-form
    # model actually receives the values, not just the visible DOM text.
    for name, val in [
        ("firstname",   firstname),
        ("surname",     surname),
        ("phoneno",     phone),
        ("email",       email),
        ("emailverify", email),   # NightsBridge requires email confirmation
        ("airline",     airline),
        ("flightno",    flightno),
        ("arrivaltime", arrival_time),
    ]:
        if val:
            _ng_set(page, name, str(val))

    if notes:
        _ng_set(page, "notes", notes)


def _check_occupancy_error(page) -> str | None:
    """
    Return NightsBridge's occupancy validation message if present, else None.
    Fires after filling adult/children counts — catches 'Too many people' before submit.
    """
    try:
        return page.evaluate(
            """() => {
                const phrases = ['too many people', 'exceeds maximum', 'capacity exceeded',
                                 'too many guests', 'maximum occupancy'];
                const body = document.body.innerText.toLowerCase();
                for (const p of phrases) {
                    if (body.includes(p)) {
                        // Find the actual visible error text for a cleaner message
                        const els = document.querySelectorAll('[class*="error"],[class*="warn"],[style*="red"],mat-error');
                        for (const el of els) {
                            const t = el.innerText?.trim();
                            if (t && t.length < 120) return t;
                        }
                        return 'Too many people for this room type. Please reduce guest count.';
                    }
                }
                return null;
            }"""
        )
    except Exception:
        return None


def _wait_for_result(page, timeout_ms: int = 20_000) -> None:
    """
    Wait until NightsBridge shows a booking result — confirmation or error.
    Falls back to a plain sleep if the JS condition never fires.
    """
    try:
        page.wait_for_function(
            """() => {
                const text = document.body.innerText.toLowerCase();
                // Success signals — "reference" excluded: it appears on the form page too
                if (text.includes('confirmed') || text.includes('thank you') ||
                    text.includes('booking number') || text.includes('booking id')) return true;
                // Error signals
                if (text.includes('not available') || text.includes('booking failed') ||
                    text.includes('unable to complete')) return true;
                return false;
            }""",
            timeout=timeout_ms,
        )
    except Exception:
        time.sleep(8)  # fallback if wait_for_function times out


def _select_payment(page, method: str = "bank_transfer") -> None:
    # For Angular forms: click the label/container, not the raw input.
    page.evaluate(
        """(method) => {
            const isBankTransfer = method === 'bank_transfer';

            // Click the Angular-friendly container (label wrapping the radio)
            const clickAngular = el => {
                // Try label first (Angular Material uses label as click target)
                const label = el.closest('label') || el.parentElement;
                if (label && label !== el) { label.click(); }
                // Also fire events on the input itself
                el.click();
                el.checked = true;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('input', { bubbles: true }));
            };

            const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
            if (!radios.length) return;

            // Strategy 1: value "1" = bank transfer
            if (isBankTransfer) {
                const r1 = radios.find(r => r.value === '1');
                if (r1) { clickAngular(r1); return; }
            }

            // Strategy 2: nearby text contains bank/eft/transfer (or card/credit)
            for (const r of radios) {
                let el = r;
                for (let i = 0; i < 5; i++) {
                    if (!el.parentElement) break;
                    el = el.parentElement;
                    const t = (el.innerText || '').toLowerCase();
                    if (isBankTransfer && (t.includes('bank') || t.includes('eft') || t.includes('transfer'))) {
                        clickAngular(r); return;
                    }
                    if (!isBankTransfer && (t.includes('card') || t.includes('credit') || t.includes('visa'))) {
                        clickAngular(r); return;
                    }
                }
            }

            // Strategy 3: only one radio — just click it
            if (radios.length === 1) { clickAngular(radios[0]); return; }

            // Strategy 4: fall back to first radio
            clickAngular(radios[0]);
        }""",
        method,
    )


def _accept_tcs(page) -> None:
    import re as _re

    # Strategy 1: Playwright native click on mat-checkbox containing T&C text.
    # Angular Material's click target is the mat-checkbox component, NOT the
    # hidden native input — clicking the component dispatches the correct events.
    try:
        loc = page.locator("mat-checkbox").filter(
            has_text=_re.compile(r"term|condition|agree|policy", _re.IGNORECASE)
        ).first
        if loc.count():
            loc.scroll_into_view_if_needed()
            loc.click(force=True)
            time.sleep(0.4)
            return
    except Exception:
        pass

    # Strategy 2: Playwright native click on label containing T&C text
    try:
        loc = page.locator("label").filter(
            has_text=_re.compile(r"term|condition|agree|policy", _re.IGNORECASE)
        ).first
        if loc.count():
            loc.scroll_into_view_if_needed()
            loc.click(force=True)
            time.sleep(0.4)
            return
    except Exception:
        pass

    # Strategy 3: Named inputs → click their enclosing label
    for name in ["tcs", "terms", "tandc"]:
        loc = page.locator(f'input[name="{name}"]').first
        if loc.count():
            try:
                label = page.locator(f'label:has(input[name="{name}"])').first
                if label.count():
                    label.scroll_into_view_if_needed()
                    label.click(force=True)
                else:
                    loc.check(force=True)
                time.sleep(0.4)
                return
            except Exception:
                pass

    # Strategy 4: JavaScript — click every checkbox near T&C text plus its container
    page.evaluate(
        """() => {
            const boxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
            for (const cb of boxes) {
                let el = cb;
                for (let i = 0; i < 6; i++) {
                    if (!el.parentElement) break;
                    el = el.parentElement;
                    const t = (el.innerText || '').toLowerCase();
                    if (t.includes('term') || t.includes('condition') || t.includes('agree') || t.includes('policy')) {
                        const label = cb.closest('label') || cb.parentElement;
                        if (label && label !== cb) label.click();
                        cb.click();
                        cb.checked = true;
                        cb.dispatchEvent(new Event('change', {bubbles: true}));
                        cb.dispatchEvent(new Event('input', {bubbles: true}));
                        return;
                    }
                }
            }
        }"""
    )

    # Strategy 5: mat-checkbox JS click (Angular Material)
    page.evaluate(
        """() => {
            const matCbs = document.querySelectorAll('mat-checkbox');
            for (const mc of matCbs) {
                const t = (mc.innerText || '').toLowerCase();
                if (t.includes('term') || t.includes('condition') || t.includes('agree') || t.includes('policy')) {
                    mc.click();
                    return;
                }
            }
        }"""
    )


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


def _parse_confirmation(page) -> dict:
    """
    Extract structured booking confirmation fields from the NightsBridge
    confirmation page. Uses DOM table rows first, regex on raw text as fallback.
    Returns an empty dict on any failure — callers treat it as optional.
    """
    try:
        return page.evaluate(r"""() => {
            const text = document.body.innerText;

            // Approach 1: pull label→value from <tr> cells
            const rows = {};
            document.querySelectorAll('tr').forEach(tr => {
                const cells = [...tr.querySelectorAll('td, th')];
                if (cells.length >= 2) {
                    const k = cells[0].innerText.trim().replace(/[:\s]+$/, '').toLowerCase();
                    const v = cells[1].innerText.trim();
                    if (k && v && k.length < 60) rows[k] = v;
                }
            });

            // Fuzzy key lookup with regex fallback
            const norm = s => s.replace(/[\s.()\/]+/g, '').toLowerCase();
            const G = (keys, pat) => {
                for (const k of keys) {
                    for (const [label, val] of Object.entries(rows)) {
                        if (norm(label).includes(norm(k))) return val;
                    }
                }
                if (pat) { const m = text.match(pat); if (m) return m[1].trim(); }
                return '';
            };

            // Property name from first sensible heading
            let propertyName = '';
            for (const el of document.querySelectorAll('h1,h2,h3')) {
                const t = el.innerText.trim();
                if (t && t.length > 5 && t.length < 120 && !/^(thank|your booking|we look)/i.test(t)) {
                    propertyName = t;
                    break;
                }
            }

            const payM = text.match(/(The property will[^\n.]+\.)/i);

            return {
                bookingId:   G(['bookingid', 'booking id', 'booking number'], /Booking\s*ID\s*(\d+)/i),
                propertyName,
                arrival:     G(['arrival'], /Arrival\s*([A-Za-z][^\n]{3,40})/i),
                leaving:     G(['leaving', 'depart'], /Leaving[:\s]*([A-Za-z][^\n]{3,40})/i),
                nights:      G(['no nights', 'nights', 'number of nights'], /No\.?\s*Nights\s*(\d+)/i),
                rooms:       G(['roomunit', 'room/unit', 'room'], /Room\/Unit\(s\)\s*([^\n]+)/i),
                total:       G(['total'], /\bTotal\s*(R[\d\s,.]+)/i),
                deposit:     G(['deposit'], /\bDeposit\s*(R[\d\s,.]+)/i),
                paymentNote: payM ? payM[1].trim() : 'The property will contact you directly with details on making payment.',
                contacts:    G(['contacts', 'contact'], /\bContacts?\s*([^\n]+)/i),
                phone:       G(['phone no', 'phone', 'telephone'], /Phone\s*No\.?\s*([^\n]+)/i),
                cell:        G(['cell no', 'cell', 'mobile'], /Cell\s*No\.?\s*([^\n]+)/i),
                email:       G(['email'], /\bEmail\s*([\w.+\-]+@[\w.\-]+)/i),
                website:     G(['website'], /Website\s*([\w.\/-]+)/i),
                address:     G(['address'], /\bAddress\s*([^\n]+)/i),
                directions:  G(['directions'], /Directions\s*([\s\S]+?)(?=\nEnjoy your stay|\n*$)/i),
            };
        }""")
    except Exception:
        return {}


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
