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
import datetime
import json
import re
import sys
import time

from playwright.sync_api import sync_playwright

NB_BBID = 21091
NB_BASE = f"https://book.nightsbridge.com/{NB_BBID}"

_MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def _month_label(iso: str) -> str:
    """'2026-09-10' -> 'September 2026' (matches the ngx-daterangepicker header)."""
    d = datetime.date.fromisoformat(iso)
    return f"{_MONTH_NAMES[d.month - 1]} {d.year}"


def _day_of(iso: str) -> int:
    return datetime.date.fromisoformat(iso).day


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

# Error substrings that mean the attempt was AMBIGUOUS/TRANSIENT — the Angular
# SPA didn't confirm, but nothing told us the room is genuinely unavailable.
# Proven empirically: retrying the IDENTICAL request with no code changes has
# turned this exact failure into a real booking (e.g. request #1 failed, #2 on
# the same room/dates booked fine seconds later) — this is a UI-automation
# timing race (a click landing before Angular finished rendering the next
# step), not a real NightsBridge rejection. Retrying is the correct fix.
_RETRYABLE_ERROR_MARKERS = (
    "did not return a booking number",
    "Could not set the stay dates",
    "Could not find the submit/confirm button",
)


def book_room(params: dict, max_attempts: int = 3) -> dict:
    """Retry wrapper around _book_room_once — see _RETRYABLE_ERROR_MARKERS for
    which failures are worth retrying (transient automation timing) vs which
    are real, stable outcomes (sold out, room/meal-plan name mismatch) that
    retrying identical params would never change."""
    last_result: dict = {"ok": False, "error": "Booking did not run"}
    for attempt in range(1, max_attempts + 1):
        result = _book_room_once(params)
        if result.get("ok"):
            return result
        last_result = result
        error_text = str(result.get("error", ""))
        is_retryable = any(marker in error_text for marker in _RETRYABLE_ERROR_MARKERS)
        if not is_retryable or attempt == max_attempts:
            break
        print(
            f"[book_nightsbridge] Attempt {attempt}/{max_attempts} was ambiguous "
            f"(transient automation timing, not a real rejection) — retrying: {error_text[:150]}",
            file=sys.stderr,
        )
        time.sleep(3)
    return last_result


def _book_room_once(params: dict) -> dict:
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
            # ── Step 1: Load booking page ────────────────────────────────
            # (The ?arrive=&depart= params are IGNORED by NightsBridge for the
            #  actual booking — we set the real dates via the date picker below.)
            url = f"{NB_BASE}?arrive={checkin}&depart={checkout}"
            page.goto(url, wait_until="networkidle", timeout=35_000)
            time.sleep(4)

            # ── Step 1b: Set the real stay dates in the picker ────────────
            # NightsBridge defaults the picker to today; without this the booking
            # would be registered for today, not the guest's chosen dates.
            if not _set_dates(page, checkin, checkout):
                return {
                    "ok": False,
                    "error": (
                        f"Could not set the stay dates ({checkin} → {checkout}) on the "
                        "NightsBridge calendar. Please try again or book directly."
                    ),
                }
            _click_check_availability(page)
            time.sleep(4)  # let availability reload for the chosen dates

            # Wait explicitly for room cards to render in Angular before proceeding.
            # On slower infrastructure the SPA may finish network requests but still
            # be painting room cards — we try btn-show-rates first, then fall back to
            # any button whose text mentions "rates" in case the class changed.
            try:
                page.wait_for_selector(
                    "button.btn-show-rates, button.btn-view-rates",
                    timeout=12_000,
                )
            except Exception:
                # Fallback: wait for any button referencing "rates"
                try:
                    page.wait_for_function(
                        "() => Array.from(document.querySelectorAll('button'))"
                        ".some(b => /rates/i.test(b.innerText))",
                        timeout=8_000,
                    )
                except Exception:
                    pass  # proceed anyway; _click_view_rates will report what it finds

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
                page,
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
            if any(p in text_lower for p in error_phrases):
                return {
                    "ok": False,
                    "error": "NightsBridge indicated no availability for these dates. " + page_text[:300],
                }

            # A GENUINE booking always ends on a confirmation page with a booking
            # NUMBER. Require one — a stray "thank you"/"confirmed" keyword is NOT
            # enough (that produced false "booked" results with a blank number).
            confirmation = _parse_confirmation(page)
            booking_ref = _extract_booking_ref(page_text) or (confirmation.get("bookingId") or "").strip()

            if booking_ref:
                try:
                    page.screenshot(path="/tmp/booking_confirmed.png")
                except Exception:
                    pass
                return {
                    "ok": True,
                    "bookingRef": booking_ref,
                    "confirmation": confirmation,
                }

            # No booking number → the booking did NOT complete. Capture what
            # NightsBridge actually showed so the real reason is recorded (e.g. a
            # last-minute booking cut-off, or a rule blocking the date).
            try:
                page.screenshot(path="/tmp/booking_no_confirm.png")
            except Exception:
                pass
            snippet = " ".join(page_text.split())[:450]
            return {
                "ok": False,
                "error": f"NightsBridge did not return a booking number. The page showed: {snippet}",
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
                let buttons = Array.from(document.querySelectorAll('button.btn-show-rates, button.btn-view-rates'));
                if (!buttons.length) {
                    buttons = Array.from(document.querySelectorAll('button')).filter(
                        b => /rates/i.test(b.innerText?.trim() || '')
                    );
                }
                // Room names are NOT in heading tags on this page — they sit at the
                // start of each room card's text ("Twin Room (Bath & Shower) Bedroom
                // with..."). Walk up from each button and grab the first line that
                // looks like a room name (mentions room/suite/family/etc, and is not
                // a price "From R..." or the button label "View rates and book").
                const ROOM_RE = /\\b(room|suite|chalet|cottage|villa|unit|apartment|family|cabin|lodge|dorm)\\b/i;
                const names = [];
                for (const btn of buttons) {
                    let el = btn;
                    for (let i = 0; i < 12; i++) {
                        if (!el.parentElement) break;
                        el = el.parentElement;
                        const txt = (el.innerText || '').replace(/\\s*Close\\s*$/i, '').trim();
                        if (txt.length < 4 || txt.length > 900) continue;
                        // First non-empty line that reads like a room name
                        const line = txt.split(/\\n+/).map(s => s.trim()).find(s =>
                            s.length >= 4 && s.length <= 60 &&
                            ROOM_RE.test(s) && !/^from\\b/i.test(s) &&
                            !/^view rates/i.test(s) && !/^\\d/.test(s));
                        if (line) { names.push(line); break; }
                    }
                }
                return [...new Set(names)];
            }"""
        )
    except Exception:
        return []


def _visible_picker_months(page) -> list[str]:
    """Month headers currently shown in the ngx-daterangepicker (e.g. ['June 2026','July 2026'])."""
    return page.evaluate(
        r"""() => [...document.querySelectorAll('table')]
            .map(t => { const m = t.querySelector('.month, th.month');
                        return m ? m.innerText.replace(/\s+/g,' ').trim() : null; })
            .filter(Boolean)"""
    )


def _set_dates(page, checkin: str, checkout: str) -> bool:
    """Drive NightsBridge's ngx-daterangepicker to the requested stay dates.

    CRITICAL: NightsBridge IGNORES the ?arrive=&depart= URL params for the actual
    booking — the date picker always defaults to *today*. So unless we set the
    picker ourselves, every booking is registered for today + 1 night, not the
    guest's chosen dates. We navigate the inline calendar (clicking the ❯ "next"
    arrow, which needs a re-render tick between clicks) and click the check-in
    then check-out day cells in the correct month.
    """
    ci_label, co_label = _month_label(checkin), _month_label(checkout)
    ci_day, co_day = _day_of(checkin), _day_of(checkout)

    def goto_month(label: str, max_hops: int = 24) -> bool:
        for _ in range(max_hops):
            if label in _visible_picker_months(page):
                return True
            clicked = page.evaluate(
                """() => { const n = document.querySelector('th.next.available');
                           if (n) { n.click(); return true; } return false; }"""
            )
            if not clicked:
                return label in _visible_picker_months(page)
            time.sleep(1.0)  # let Angular re-render the calendar
        return label in _visible_picker_months(page)

    def click_day(label: str, day: int) -> bool:
        return page.evaluate(
            r"""([label, day]) => {
                const t = [...document.querySelectorAll('table')].find(tb => {
                    const m = tb.querySelector('.month, th.month');
                    return m && m.innerText.replace(/\s+/g,' ').trim().toLowerCase() === label.toLowerCase();
                });
                if (!t) return false;
                const cell = [...t.querySelectorAll('td.available')].find(td =>
                    !/off|disabled|hidden/.test(td.className) && td.innerText.trim() === String(day));
                if (!cell) return false;
                cell.click();
                return true;
            }""",
            [label, day],
        )

    if not goto_month(ci_label):
        return False
    if not click_day(ci_label, ci_day):
        return False
    time.sleep(0.8)
    if not goto_month(co_label):
        return False
    if not click_day(co_label, co_day):
        return False
    time.sleep(0.8)
    return True


def _click_check_availability(page) -> None:
    """Click the calendar's CHECK AVAILABILITY button to reload rooms for the picked dates."""
    page.evaluate(
        """() => {
            const b = [...document.querySelectorAll('button')]
                .find(x => /check availability/i.test(x.innerText || ''));
            if (b) b.click();
        }"""
    )


def _click_view_rates(page, room_type_name: str) -> bool:
    """Find the room card matching room_type_name and click its VIEW RATES AND BOOK button.

    CRITICAL — each room card sits inside a shared parent that lists EVERY room, so
    matching with `.includes()` on ancestor text falsely matches the first room
    (its high-level ancestor "contains" every room name). We therefore match with
    `.startsWith()`: a button only matches the ancestor card whose text BEGINS with
    the requested room name — that card belongs to this button alone.

    Pass 1: exact — the button's own card starts with the full requested name
            (e.g. "Double Room (Bath)"). Most precise; prefers visible buttons.
    Pass 2: fallback — strip the parenthetical variant (e.g. "(Bath & Shower)")
            and score every card that starts with the base name by word overlap,
            picking the closest variant. Handles catalogue/NB naming differences
            like our "Twin Room (Bath & Shower)" vs NB's "Twin Room (Shower)".
    """
    return page.evaluate(
        """(roomTypeName) => {
            function normalise(text) {
                return (text || '').replace(/\\s*Close\\s*$/i, '').trim();
            }
            function isVisible(el) { return !!(el && el.offsetParent !== null); }

            // Base name: everything before the first '(' — used as fallback
            const baseName = roomTypeName.replace(/\\s*\\(.*$/, '').trim().toLowerCase();
            const wanted = roomTypeName.toLowerCase();

            // Known class first; fall back to any "rates"-labelled button in case
            // NightsBridge renames their CSS class between deployments.
            let buttons = Array.from(document.querySelectorAll('button.btn-show-rates, button.btn-view-rates'));
            if (!buttons.length) {
                buttons = Array.from(document.querySelectorAll('button')).filter(
                    b => /rates/i.test(b.innerText?.trim() || '')
                );
            }

            function clickBtn(btn) {
                btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                btn.click();
                return true;
            }

            // ── Pass 1: exact start-of-card match (visible buttons first) ──────
            for (const requireVisible of [true, false]) {
                for (const btn of buttons) {
                    if (requireVisible && !isVisible(btn)) continue;
                    let el = btn;
                    for (let i = 0; i < 12; i++) {
                        if (!el.parentElement) break;
                        el = el.parentElement;
                        const txt = normalise(el.innerText).toLowerCase();
                        if (txt.startsWith(wanted)) return clickBtn(btn);
                        // Reached this button's own card (starts with base name) but
                        // it's not the exact variant — stop walking up so we don't
                        // bleed into the shared parent that lists every room.
                        if (baseName && txt.startsWith(baseName)) break;
                    }
                }
            }

            // ── Pass 2: scored best variant among cards starting with base name ─
            if (baseName) {
                const reqWords = roomTypeName.toLowerCase()
                    .replace(/[()&,+]/g, ' ').split(/\\s+/).filter(Boolean);
                const candidates = [];
                for (const btn of buttons) {
                    let el = btn;
                    for (let i = 0; i < 12; i++) {
                        if (!el.parentElement) break;
                        el = el.parentElement;
                        const txt = normalise(el.innerText).toLowerCase();
                        if (txt.startsWith(baseName)) {
                            const name = txt.slice(0, 60);   // room name + a little
                            const score = reqWords.filter(w => name.includes(w)).length;
                            candidates.push({ btn, score, len: txt.length, vis: isVisible(btn) });
                            break;  // this is the button's own card
                        }
                    }
                }
                if (candidates.length > 0) {
                    // best score → prefer visible → prefer tighter (more specific) card
                    candidates.sort((a, b) =>
                        b.score - a.score || (b.vis - a.vis) || a.len - b.len);
                    return clickBtn(candidates[0].btn);
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
    # Dates are set on the calendar in Step 1b (_set_dates) — the guest form has
    # no arrive/depart fields, so nothing date-related is done here.

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
    """Click the booking-form's CONFIRM BOOKING button.

    CRITICAL: NightsBridge renders the whole flow on ONE Angular page, so the
    DOM contains ~30 `type="submit"` buttons at once — CHECK AVAILABILITY, SHOW
    MORE, VIEW RATES AND BOOK, BOOK NOW, etc. The previous code grabbed the FIRST
    `button[type=submit]`, which is CHECK AVAILABILITY — so it re-ran the search
    instead of submitting the booking, and nothing was ever registered.

    We now target the confirm button specifically: by its `confirm-button` class
    first, then by exact "CONFIRM BOOKING"/"COMPLETE BOOKING"/etc. text, and we
    explicitly skip the calendar / rates / book-now / show-more buttons.
    """
    result = page.evaluate(
        """() => {
            const click = (b) => { b.scrollIntoView({behavior:'instant',block:'center'});
                                   b.click(); return b.innerText.trim() || b.className; };
            const visible = (b) => b.offsetParent !== null && !b.disabled;
            const all = Array.from(document.querySelectorAll('button')).filter(visible);

            // 1. Strongest signal: the confirm-button class NightsBridge uses
            const byClass = all.find(b => /confirm[-_ ]?button/i.test(b.className));
            if (byClass) return click(byClass);

            // 2. Exact confirm/complete text (NOT 'CHECK AVAILABILITY', 'BOOK NOW',
            //    'VIEW RATES AND BOOK', 'SHOW MORE', 'HIDE …')
            const SKIP = /check availability|view rates|book now|show more|hide |hide$|search|login/i;
            const WANT = ['CONFIRM BOOKING', 'COMPLETE BOOKING', 'PLACE BOOKING',
                          'CONFIRM RESERVATION', 'CONFIRM'];
            for (const want of WANT) {
                const btn = all.find(b => {
                    const t = (b.innerText || '').trim().toUpperCase();
                    return t === want && !SKIP.test(t);
                });
                if (btn) return click(btn);
            }

            // 3. Last resort: any submit button that mentions "confirm"/"complete"
            //    in its text, excluding the known non-submit actions.
            const loose = all.find(b => {
                const t = (b.innerText || '').trim();
                return /confirm|complete/i.test(t) && !SKIP.test(t);
            });
            if (loose) return click(loose);

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
