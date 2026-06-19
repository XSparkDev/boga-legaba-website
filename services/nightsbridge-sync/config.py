"""
Settings for the NightsBridge bookings scraper.

We log in through the website (an Angular app), then read bookings from the
same JSON API the calendar uses: bridgeitapi -> BookingCalendarRQ.
"""

from pathlib import Path

# ---------------------------------------------------------------------------
# URLs
# ---------------------------------------------------------------------------
LOGIN_URL = "https://login.nightsbridge.com/"
DASHBOARD_URL = "https://www.nightsbridge.com/dashboard/home"
API_URL = "https://bridgeit.nightsbridge.com/bridgeitapi"

# ---------------------------------------------------------------------------
# Login form selectors (confirmed by rendering the real page)
# ---------------------------------------------------------------------------
# Input ids are random GUIDs that change each load, so we select by type.
LOGIN_SELECTORS = {
    "username": "input[type='text']",
    "password": "input[type='password']",
    "submit": "button.btn-primary",   # the "Login" button
}

# A link that only exists once you're logged into the dashboard. We use it both
# to detect a valid session AND to read the calendar loginkey (it's in the URL).
CALENDAR_LINK = "a:has-text('Go to Calendar')"

# ---------------------------------------------------------------------------
# API parameters
# ---------------------------------------------------------------------------
COUNTRY_LOCATION_ID = 179          # seen in the live BookingCalendarRQ request
DEFAULT_DAYS_AHEAD = 60            # how far forward to fetch if no DATE_TO given

# Booking status letter -> human description (from the API's BootstrapRQ).
STATUS_CODES = {
    "C": "Confirmed",
    "W": "Waiting for Deposit",
    "P": "Provisional",
    "R": "Reserved with Auto-Expire",
    "S": "Paid",
    "O": "Outstanding Account",
    "U": "Unavailable",
}

# ---------------------------------------------------------------------------
# Politeness / timeouts
# ---------------------------------------------------------------------------
TIMEOUT_MS = 30_000

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).parent
STATE_FILE = PROJECT_ROOT / "storage_state.json"   # saved login session
OUTPUT_DIR = PROJECT_ROOT / "output"               # results land here
