"""
Book a room by automating NightsBridge's ADMIN Calendar → "Add Booking" flow —
the same screen a staff member uses manually — instead of the public guest
booking widget (book_nightsbridge.py, kept intact and unused by default).

Selectors below were confirmed against the LIVE admin dashboard (calendar.
nightsbridge.com/add-booking) via direct DOM inspection, not guessed:
  - Dates: ngx-bootstrap `bs-datepicker` (`.bs-datepicker-head`, `td[role="gridcell"]
    span[bsdatepickerdaydecorator]`).
  - Room/Unit: a single native <select> (NOT a custom combobox). It DOES
    appear to be date-filtered — a live test run against dates with zero
    conflicts across the whole property showed all 26 units, which is
    consistent with "no unit was excluded because none were booked" rather
    than "the list is never filtered." Treat a candidate unit's absence from
    the list as a real signal that it's unavailable for the selected dates
    (resolve_units_for_room_type() below already does this — it only chooses
    a unit that appears in the live dropdown). Availability is additionally
    gated upstream (checkRoomTypeAvailableLive in the website) before this
    script ever runs, so this is defense-in-depth, not the only check.
  - The dropdown lists INDIVIDUAL unit names (e.g. "Reeds", "Blue Sea"), not
    room-type categories like the website's roomTypeName ("Double Room (Bath
    & Shower)"). ROOM_CATALOG (room_catalog.py) maps each unit to its
    configuration + bathroom_type, which concatenate to EXACTLY the
    roomTypeName format (confirmed live: selecting "Reeds" produces the room
    card title "Reeds - Double Room (Bath & Shower)"). resolve_units_for_room_type()
    below does this reverse lookup.
  - Per-room-card fields (Rate Plan + occupancy) only exist once a room is
    added, scoped to that room's own card via Angular's formcontrolname
    attributes: bbrateid (Rate Plan), noadults, child1, child2.
  - Guest fields are on cui-drop-down (First Name, Surname, Company — real
    autocomplete widgets with a "Type to search" empty state) and cui-input
    (Phone No, Email), addressed via formcontrolname.
  - The modal's submit button and the calendar page's OWN "Add Booking"
    trigger button both have the text "Add Booking" — the modal submit is
    distinguished by NOT having the addBookingBtn class.

Usage:
  python book_nightsbridge_admin.py --params '{"checkin":"2026-09-10", ...}'

Required params: checkin, checkout, roomTypeName, mealPlanName, firstname,
                  surname, phone, email
Optional params: adults (default 2), children1 (0-5, default 0),
                  children2 (6-12, default 0), company, reference (used only
                  for log correlation — NOT sent to NightsBridge)

Env: SITE_USER, SITE_PASS (NightsBridge ADMIN credentials)
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import sys
import time

sys.path.insert(0, ".")
import auth  # noqa: E402  (reuses login + session persistence)
from room_catalog import ROOM_CATALOG  # noqa: E402

NBID_RE = re.compile(r"/booking-summary/(\d+)", re.I)

_MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

# NightsBridge's Rate Plan option labels (confirmed live) that the website's
# mealPlanName values need to map onto.
_RATE_PLAN_ALIASES = {
    "bed and breakfast": "Bed & Breakfast",
    "bed & breakfast": "Bed & Breakfast",
    "b&b": "Bed & Breakfast",
    "dinner, bed and breakfast": "Dinner, Bed & Breakfast",
    "dinner, bed & breakfast": "Dinner, Bed & Breakfast",
    "dbb": "Dinner, Bed & Breakfast",
    "room only": "Room Only",
    "self catering": "Room Only",
}


def _normalize_room_type(s: str) -> str:
    """Canonicalise a room-type label so the website's naming and the admin
    catalog's naming compare equal.

    They differ ONLY in bathroom wording: NightsBridge's PUBLIC rates page —
    which is where the website's roomTypeName originates (rate_cache.rtname) —
    says "(Shower)" / "(Bath)", while ROOM_CATALOG (matching the admin
    dropdown's room-card titles) says "(Shower only)" / "(Bath only)". The
    "(Bath & Shower)" variants already match verbatim. Without this, every
    single-bathroom room type (5 of the 8 the site offers) fails to resolve to
    any unit and the booking dies with "No unit for room type ... found in the
    dropdown". Verified against all 8 live rate_cache.rtname values vs every
    catalog-built type; the normalization is exact and collision-free ("bath",
    "shower", and "bath & shower" stay distinct)."""
    s = s.strip().lower()
    s = s.replace(" and ", " & ")
    s = re.sub(r"\bonly\b", "", s)   # "shower only" -> "shower"
    s = re.sub(r"\s+", " ", s)        # collapse the whitespace "only" left behind
    s = s.replace("( ", "(").replace(" )", ")")
    return s.strip()


def resolve_units_for_room_type(room_type_name: str) -> list[str]:
    """Reverse ROOM_CATALOG: given a website roomTypeName like 'Double Room
    (Bath & Shower)', return every individual unit name that belongs to that
    category, in catalog order. Confirmed live: selecting a unit produces a
    room-card title of exactly f"{unit} - {configuration} Room ({bathroom_type})".
    Comparison is normalized (see _normalize_room_type) so the public-rates
    "(Shower)" spelling matches the catalog's "(Shower only)"."""
    wanted = _normalize_room_type(room_type_name)
    matches = []
    for unit, meta in ROOM_CATALOG.items():
        built = _normalize_room_type(f"{meta.get('configuration', '')} Room ({meta.get('bathroom_type', '')})")
        if built == wanted:
            matches.append(unit)
    return matches


def _resolve_rate_plan_label(meal_plan_name: str) -> str:
    key = meal_plan_name.strip().lower()
    return _RATE_PLAN_ALIASES.get(key, meal_plan_name)


def _month_label(iso: str) -> str:
    d = datetime.date.fromisoformat(iso)
    return f"{_MONTH_NAMES[d.month - 1]} {d.year}"


def _day_of(iso: str) -> int:
    return datetime.date.fromisoformat(iso).day


def _shot(page, name: str) -> None:
    # Off by default: this runs ~17x per booking, and each full-page PNG
    # capture (page render + encode + disk write) is real memory/IO pressure
    # on the worker's 512MB Render instance — pure debugging cost with no
    # production value, since nothing ever reads /tmp/admin_booking_*.png on
    # a server with no way to retrieve files off it. Opt in locally with
    # DEBUG_SCREENSHOTS=true.
    if os.environ.get("DEBUG_SCREENSHOTS", "false").lower() != "true":
        return
    try:
        page.screenshot(path=f"/tmp/admin_booking_{name}.png")
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Step 1: Calendar -> Add Booking
# ---------------------------------------------------------------------------

def _is_login_page(page) -> bool:
    """True if we've been bounced to the NightsBridge login form.

    Needed because the dashboard SPA can render its logged-in nav chrome
    (including the "Go to Calendar" link that auth._is_logged_in() checks)
    from cached client-side state before the server actually validates the
    session — so a saved session can look valid at login-check time and still
    get bounced to /login on the very next real navigation. Detected by URL
    host, not DOM text, since the login form's own copy can change."""
    if "login.nightsbridge.com" in page.url:
        return True
    try:
        return page.locator("input[type='password']").count() > 0 and page.locator(
            "a:has-text('Go to Calendar')"
        ).count() == 0
    except Exception:
        return False


def _open_add_booking(page) -> bool | str:
    """Returns True (opened), False (couldn't open — real UI failure), or
    "relogin" (bounced to the login page — the caller should re-authenticate
    and call this again once)."""
    try:
        page.click("a:has-text('Go to Calendar')", timeout=10_000)
    except Exception:
        pass  # may already be on the calendar
    try:
        # domcontentloaded, not networkidle: the calendar SPA never goes fully
        # network-idle, so networkidle burned the whole 15s here every time.
        # The Add-Booking click below has its own 10s actionability wait.
        page.wait_for_load_state("domcontentloaded", timeout=15_000)
    except Exception:
        pass
    time.sleep(1)

    if _is_login_page(page):
        return "relogin"

    try:
        page.click("button.addBookingBtn", timeout=10_000)
    except Exception:
        try:
            page.click("button:has-text('Add Booking')", timeout=5_000)
        except Exception:
            return "relogin" if _is_login_page(page) else False
    # Wait for the ACTUAL arrival-date input to be present — the exact element
    # the next step drives. We match it by its Angular formcontrolname
    # ('fromdate'), NOT placeholder: NightsBridge now renders THREE inputs with
    # placeholder='Select Date' (an extra month-caption input, value "July 2026",
    # comes first), so the old placeholder+index approach grabbed the wrong,
    # unclickable element. formcontrolname is unique and stable.
    try:
        page.wait_for_selector("[formcontrolname='fromdate'] input", timeout=12_000, state="attached")
        return True
    except Exception:
        if page.evaluate("() => document.querySelector('cui-date-selector') !== null"):
            return True
        return "relogin" if _is_login_page(page) else False


# ---------------------------------------------------------------------------
# Step 2: Arrival / Departure dates — ngx-bootstrap bs-datepicker
# ---------------------------------------------------------------------------

def _read_month_year(page) -> str:
    parts = page.evaluate(
        """() => [...document.querySelectorAll('.bs-datepicker-head button.current span')]
            .map(s => s.textContent.trim())"""
    )
    return " ".join(parts)


def _goto_picker_month(page, wanted_label: str, max_hops: int = 30) -> bool:
    for _ in range(max_hops):
        if _read_month_year(page).lower() == wanted_label.lower():
            return True
        try:
            page.click(".bs-datepicker-head button.next", timeout=2_000)
        except Exception:
            return False
        time.sleep(0.35)
    return _read_month_year(page).lower() == wanted_label.lower()


def _click_picker_day(page, day: int) -> bool:
    return page.evaluate(
        """(day) => {
            const cells = [...document.querySelectorAll('td[role="gridcell"] span[bsdatepickerdaydecorator]')]
                .filter(el => el.offsetParent !== null
                    && !/is-other-month|disabled/.test(el.className)
                    && el.textContent.trim() === String(day));
            if (!cells.length) return false;
            cells[0].click();
            return true;
        }""",
        day,
    )


def _set_date_field(page, input_locator, iso_date: str, field_label: str) -> bool:
    try:
        # Open the ngx-bootstrap datepicker with a direct DOM click. A normal
        # Playwright .click() scrolls the field up under the modal's sticky
        # header, which then intercepts the click so the picker never opens
        # (this is what caused the "Could not open the ... picker" failures). A
        # JS click fires the same event Angular listens for, with no scrolling.
        input_locator.evaluate("el => el.click()")
    except Exception:
        print(f"[admin-booking] Could not open the {field_label} picker", file=sys.stderr)
        return False
    time.sleep(0.6)
    label = _month_label(iso_date)
    if not _goto_picker_month(page, label):
        print(f"[admin-booking] Could not navigate {field_label} picker to {label}", file=sys.stderr)
        return False
    if not _click_picker_day(page, _day_of(iso_date)):
        print(f"[admin-booking] Could not click day {_day_of(iso_date)} for {field_label}", file=sys.stderr)
        return False
    time.sleep(0.5)
    return True


def _read_nights(page) -> int | None:
    try:
        val = page.locator("input[placeholder='Nights']").input_value(timeout=3_000)
        return int(val) if val else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Step 3: Select Room / Unit — single native <select>, appears date-filtered
# (a unit already booked for the selected dates is absent from the list).
# ---------------------------------------------------------------------------

def _list_room_options(page) -> list[str]:
    return page.evaluate(
        """() => {
            const sel = document.querySelector('select');
            return sel ? [...sel.options].map(o => o.textContent.trim()).filter(t => t && t !== 'Add available room or unit') : [];
        }"""
    )


def _select_room_unit(page, unit_name: str) -> bool:
    try:
        page.locator("select").first.select_option(label=unit_name, timeout=5_000)
        return True
    except Exception:
        return False


def _count_room_cards(page) -> int:
    return page.evaluate(
        """() => [...document.querySelectorAll('cui-input[formcontrolname="bbrateid"]')].length"""
    )


def _room_card_titles(page) -> list[str]:
    return page.evaluate(
        """() => [...document.querySelectorAll('span.fw-semibold.fs-14')]
            .map(el => el.textContent.trim())
            .filter(t => t.includes(' - '))"""
    )


def _remove_extra_room_cards(page, keep_unit_name: str) -> None:
    for _ in range(10):
        removed = page.evaluate(
            """(keepName) => {
                const headers = [...document.querySelectorAll('span.fw-semibold.fs-14')]
                    .filter(el => el.textContent.includes(' - '));
                for (const h of headers) {
                    if (h.textContent.trim().toLowerCase().startsWith(keepName.toLowerCase() + ' -')) continue;
                    const row = h.closest('.d-flex.flex-row.align-items-center.justify-content-between');
                    const btn = row ? row.querySelector('cui-button[leadingicon*="minus"] button, button[leadingicon*="minus"]') : null;
                    if (btn) { btn.click(); return true; }
                }
                return false;
            }""",
            keep_unit_name,
        )
        if not removed:
            break
        time.sleep(0.4)


# ---------------------------------------------------------------------------
# Step 4: Rate Plan + occupancy, scoped to the room's own card via formcontrolname.
# ---------------------------------------------------------------------------

def _select_rate_plan(page, meal_plan_label: str) -> bool:
    try:
        page.locator("cui-input[formcontrolname='bbrateid'] select").first.select_option(
            label=meal_plan_label, timeout=5_000,
        )
        return True
    except Exception:
        return False


def _native_set(page, locator, value: str) -> None:
    handle = locator.element_handle()
    if handle is None:
        return
    page.evaluate(
        """([el, value]) => {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(el, value);
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
        }""",
        [handle, value],
    )


def _set_occupancy(page, adults: int, children1: int, children2: int) -> bool:
    ok = True
    try:
        _native_set(page, page.locator("cui-input[formcontrolname='noadults'] input").first, str(adults))
    except Exception:
        ok = False
    if children1:
        try:
            _native_set(page, page.locator("cui-input[formcontrolname='child1'] input").first, str(children1))
        except Exception:
            ok = False
    if children2:
        try:
            _native_set(page, page.locator("cui-input[formcontrolname='child2'] input").first, str(children2))
        except Exception:
            ok = False
    return ok


# ---------------------------------------------------------------------------
# Step 5: Guest fields.
# ---------------------------------------------------------------------------

def _fill_guest_field(page, selector: str, value: str, field_label: str) -> bool:
    try:
        loc = page.locator(selector).first
        _native_set(page, loc, value)
        time.sleep(0.4)
        # Autocomplete fields (firstname/surname/company) may open a
        # suggestion panel — dismiss without selecting so our typed value
        # stays authoritative.
        has_panel = page.evaluate(
            """() => !!document.querySelector('[data-part="options"] [data-part]:not(.dropdown-empty)')"""
        )
        if has_panel:
            page.keyboard.press("Escape")
            time.sleep(0.2)
        return True
    except Exception:
        print(f"[admin-booking] Could not fill {field_label}", file=sys.stderr)
        return False


def _fill_guest_details(page, firstname: str, surname: str, phone: str, email: str, company: str | None) -> dict:
    results = {
        "firstname": _fill_guest_field(page, "cui-drop-down[formcontrolname='firstname'] input", firstname, "First Name"),
        "surname": _fill_guest_field(page, "cui-drop-down[formcontrolname='surname'] input", surname, "Surname"),
        "phone": _fill_guest_field(page, "cui-input[formcontrolname='phoneno'] input", phone, "Phone No"),
        "email": _fill_guest_field(page, "cui-input[formcontrolname='email'] input", email, "Email"),
    }
    if company:
        results["company"] = _fill_guest_field(page, "cui-drop-down[formcontrolname='company'] input", company, "Company")
    return results


# ---------------------------------------------------------------------------
# Step 6: pre-submit checklist.
# ---------------------------------------------------------------------------

def _pre_submit_checklist(page, unit_name: str, guest_field_results: dict) -> tuple[bool, str]:
    nights = _read_nights(page)
    if not nights or nights <= 0:
        return False, f"Nights did not auto-calculate correctly (read: {nights!r}) — dates likely did not register"

    card_count = _count_room_cards(page)
    if card_count == 0:
        return False, "No room card present after selection"
    if card_count > 1:
        return False, f"{card_count} room cards present after cleanup attempt — refusing to submit with ambiguous room selection"

    titles = _room_card_titles(page)
    if titles and not titles[0].lower().startswith(unit_name.lower() + " -"):
        return False, f"The one room card present does not match the requested unit ('{unit_name}') — card title: {titles[0]!r}"

    missing_fields = [k for k, ok in guest_field_results.items() if not ok]
    if missing_fields:
        return False, f"Guest field(s) not confirmed filled: {', '.join(missing_fields)}"

    return True, ""


def _submit_booking(page) -> bool:
    try:
        page.locator("button.btn-primary:has-text('Add Booking'):not(.addBookingBtn)").first.click(timeout=5_000)
        return True
    except Exception:
        try:
            page.locator(".modal-content button:has-text('Add Booking')").first.click(timeout=5_000)
            return True
        except Exception:
            return False


# ---------------------------------------------------------------------------
# Step 7: verification — hard gate on /booking-summary/{NBID}.
# ---------------------------------------------------------------------------

def _verify_booking_summary(page, expected_unit: str, expected_firstname: str, expected_surname: str) -> dict:
    try:
        page.wait_for_url("**/booking-summary/**", timeout=20_000)
    except Exception:
        return {"ok": False, "error": "Submit did not navigate to /booking-summary/{NBID} — the booking was NOT verified as created. Do not proceed to email/payment."}

    match = NBID_RE.search(page.url)
    nbid = match.group(1) if match else None
    if not nbid:
        return {"ok": False, "error": f"Landed on a booking-summary-like URL but could not parse an NBID from it: {page.url}"}

    time.sleep(1.5)
    # Include form-field VALUES, not just visible text. On the redesigned
    # booking-summary the guest name is shown INSIDE <input> boxes (the "Guest"
    # and "Booking Made By" fields), and element.value is NOT part of
    # document.body.innerText — so a text-only scrape misses the name and
    # false-negatives a perfectly good booking (confirmed live: NBID created,
    # name visibly correct on screen, yet firstname/surname "not found").
    page_text = page.evaluate(
        """() => {
            const parts = [document.body.innerText];
            document.querySelectorAll('input, textarea, select').forEach(el => {
                if (el.value) parts.push(el.value);
            });
            return parts.join(' ');
        }"""
    )
    flat = " ".join(page_text.split())

    booking_id_match = re.search(r"Booking\s*ID[:\s#]+([A-Za-z0-9\-]+)", flat, re.I)
    booking_id = booking_id_match.group(1) if booking_id_match else None

    # Checked individually, not as one concatenated "firstname surname" string:
    # confirmed live that NightsBridge's own "Booking Made By"/Guest field
    # truncates long combined names in its display (an unusually long test
    # name — "TEST AUTOMATION" + "DO NOT USE" — got cut to "...DO NOT"), so a
    # full-string match is too strict and would false-negative on a real,
    # successful booking. Firstname/surname individually are far less likely
    # to be truncated (they're the normal-length parts).
    checks = {
        "unit_present": expected_unit.lower() in flat.lower(),
        "firstname_present": expected_firstname.lower() in flat.lower(),
        "surname_present": expected_surname.lower() in flat.lower(),
    }
    mismatches = [k for k, ok in checks.items() if not ok]
    if mismatches:
        return {
            "ok": False,
            "error": f"Booking summary page does not confirm expected details ({', '.join(mismatches)}). NBID={nbid} was created but details don't match — flag for manual review, do NOT proceed to email/payment.",
            "nbid": nbid,
            "bookingId": booking_id,
        }

    return {
        "ok": True,
        "nbid": nbid,
        "bookingRef": nbid,
        "bookingId": booking_id,
        "summaryUrl": page.url,
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def book_room(params: dict) -> dict:
    checkin      = params["checkin"]
    checkout     = params["checkout"]
    room_type    = params["roomTypeName"]
    meal_plan    = params["mealPlanName"]
    adults       = int(params.get("adults", 2))
    children1    = int(params.get("children1", 0))
    children2    = int(params.get("children2", 0))
    firstname    = params["firstname"]
    surname      = params["surname"]
    phone        = params["phone"]
    email        = params["email"]
    company      = params.get("company")
    reference    = params.get("reference", "")

    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        import os
        headless = os.environ.get("HEADLESS", "true").lower() == "true"
        # --disable-dev-shm-usage: Docker's default /dev/shm is only 64MB, far
        # too small for Chromium's shared memory needs — without this flag the
        # browser can crash near-instantly on launch inside a container, with
        # no Python exception and no captured stderr (the OS just kills it),
        # which is exactly what an "ok": False with an empty error looks like
        # upstream. --no-sandbox is required because the worker container runs
        # as root, where Chromium's sandbox refuses to start at all.
        #
        # The worker's Render instance is a 512MB Starter box — that flag alone
        # only avoids one specific crash mode (shm too small), it doesn't lower
        # Chromium's actual memory use, so it can still get OOM-killed under
        # cgroup pressure (same silent, no-stderr failure). The rest of these
        # flags are the standard low-memory Chromium recipe for exactly this
        # constraint: no GPU/software-rasterizer process, no extensions/sync/
        # translate/background-networking machinery, occluded-window/backgrounding
        # timers off (so a headless page doesn't get throttled into weird
        # states), and a capped V8 heap.
        browser = p.chromium.launch(
            headless=headless,
            args=[
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-gpu",
                "--disable-software-rasterizer",
                "--disable-extensions",
                "--disable-background-networking",
                "--disable-sync",
                "--disable-translate",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
                "--metrics-recording-only",
                "--mute-audio",
                "--no-first-run",
                "--js-flags=--max-old-space-size=192",
            ],
        )
        page = None
        try:
            print(f"[admin-booking] ref={reference} logging in (admin)...", file=sys.stderr)
            context, page = auth.get_authenticated_context(browser)

            candidate_units = resolve_units_for_room_type(room_type)
            if not candidate_units:
                # Not a category name — try it directly as a raw unit name
                # (useful for standalone/manual testing).
                candidate_units = [room_type]
            print(f"[admin-booking] ref={reference} room type '{room_type}' resolves to candidate units: {candidate_units}", file=sys.stderr)

            print(f"[admin-booking] ref={reference} opening Add Booking...", file=sys.stderr)
            opened = _open_add_booking(page)
            if opened == "relogin":
                # The dashboard's saved-session check can false-positive (the
                # SPA renders logged-in nav from cached client state before the
                # server actually validates it), so we only discover the
                # session is really dead here, on the first real navigation.
                # Re-authenticate fresh and give it exactly one more try.
                print(f"[admin-booking] ref={reference} bounced to login mid-flow — re-authenticating...", file=sys.stderr)
                auth._perform_login(page)
                context.storage_state(path=str(auth.config.STATE_FILE))
                opened = _open_add_booking(page)
            if opened is not True:
                _shot(page, "01_add_booking_open_failed")
                return {"ok": False, "error": "Could not open the Add Booking form"}
            _shot(page, "01_add_booking_open")

            print(f"[admin-booking] ref={reference} setting arrival date {checkin}...", file=sys.stderr)
            arrival_input = page.locator("[formcontrolname='fromdate'] input")
            if not _set_date_field(page, arrival_input, checkin, "Arrival Date"):
                _shot(page, "02_arrival_failed")
                return {"ok": False, "error": f"Could not set Arrival Date to {checkin}"}

            print(f"[admin-booking] ref={reference} setting departure date {checkout}...", file=sys.stderr)
            departure_input = page.locator("[formcontrolname='todate'] input")
            if not _set_date_field(page, departure_input, checkout, "Departure Date"):
                _shot(page, "02_departure_failed")
                return {"ok": False, "error": f"Could not set Departure Date to {checkout}"}

            nights = _read_nights(page)
            print(f"[admin-booking] ref={reference} Nights auto-calculated: {nights}", file=sys.stderr)
            if not nights or nights <= 0:
                _shot(page, "02_nights_not_calculated")
                return {"ok": False, "error": f"Dates did not register — Nights read as {nights!r}, expected > 0"}
            _shot(page, "02_dates_set")

            visible_units = _list_room_options(page)
            chosen_unit = next((u for u in candidate_units if u in visible_units), None)
            if not chosen_unit:
                _shot(page, "03_no_unit_available")
                return {
                    "ok": False,
                    "error": f"No unit for room type '{room_type}' found in the dropdown. "
                             f"Candidates tried: {candidate_units}. Dropdown had: {visible_units}.",
                }

            print(f"[admin-booking] ref={reference} selecting unit '{chosen_unit}'...", file=sys.stderr)
            if not _select_room_unit(page, chosen_unit):
                _shot(page, "03_room_select_failed")
                return {"ok": False, "error": f"Unit '{chosen_unit}' was listed but selecting it failed"}
            time.sleep(1)
            _shot(page, "03_room_selected")

            _remove_extra_room_cards(page, chosen_unit)
            card_count = _count_room_cards(page)
            print(f"[admin-booking] ref={reference} room cards present after cleanup: {card_count}", file=sys.stderr)

            rate_plan_label = _resolve_rate_plan_label(meal_plan)
            print(f"[admin-booking] ref={reference} setting Rate Plan '{rate_plan_label}'...", file=sys.stderr)
            if not _select_rate_plan(page, rate_plan_label):
                _shot(page, "04_rate_plan_failed")
                return {"ok": False, "error": f"Could not set Rate Plan to '{rate_plan_label}'"}

            print(f"[admin-booking] ref={reference} setting occupancy (adults={adults}, child1={children1}, child2={children2})...", file=sys.stderr)
            _set_occupancy(page, adults, children1, children2)

            print(f"[admin-booking] ref={reference} filling guest details...", file=sys.stderr)
            guest_results = _fill_guest_details(page, firstname, surname, phone, email, company)
            _shot(page, "04_form_filled")

            print(f"[admin-booking] ref={reference} running pre-submit checklist...", file=sys.stderr)
            ok, reason = _pre_submit_checklist(page, chosen_unit, guest_results)
            if not ok:
                _shot(page, "05_pre_submit_check_failed")
                return {"ok": False, "error": f"Pre-submit check failed: {reason}"}

            print(f"[admin-booking] ref={reference} pre-submit checklist passed — submitting...", file=sys.stderr)
            if not _submit_booking(page):
                _shot(page, "06_submit_click_failed")
                return {"ok": False, "error": "Could not find/click the Add Booking submit button"}

            print(f"[admin-booking] ref={reference} verifying via booking-summary page...", file=sys.stderr)
            result = _verify_booking_summary(page, chosen_unit, firstname, surname)
            if not result.get("ok"):
                _shot(page, "07_verification_failed")
                print(f"[admin-booking] ref={reference} VERIFICATION FAILED: {result.get('error')}", file=sys.stderr)
                return result
            # The exact physical room actually booked — e.g. "Red Room", not
            # the category ("Double Room (Bath only)"). Booking now goes
            # straight into the calendar for a specific unit, so we always
            # know this for real (unlike the old guest-widget flow, which
            # only ever knew the category) — the website should show this,
            # not the category, wherever the room is displayed to the guest.
            result["roomName"] = chosen_unit
            _shot(page, "07_verified")
            print(f"[admin-booking] ref={reference} VERIFIED — NBID={result['nbid']} bookingId={result.get('bookingId')} room={chosen_unit}", file=sys.stderr)
            return result

        except Exception as exc:
            if page is not None:
                _shot(page, "99_unhandled_exception")
            print(f"[admin-booking] ref={reference} UNHANDLED EXCEPTION: {exc}", file=sys.stderr)
            return {"ok": False, "error": f"Unhandled exception: {exc}"}
        finally:
            browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Book a room via NightsBridge's admin Add Booking flow")
    parser.add_argument("--params", required=True, help="JSON booking params")
    args = parser.parse_args()
    params = json.loads(args.params)
    result = book_room(params)
    print(json.dumps(result))
    sys.exit(0 if result.get("ok") else 1)
