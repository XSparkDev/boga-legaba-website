"""
Thin client for the NightsBridge bridgeitapi.

The API is a single POST endpoint. The body is form-encoded as `data=<json>`,
where the JSON has a `messagename`, a `credentials.loginkey`, and any
message-specific fields. Responses look like {"success": bool, "data": {...}}.

Auth: the dashboard gives us an initial loginkey; BootstrapRQ exchanges it for
a session loginkey that the other messages use.
"""

from __future__ import annotations

import json

import config


class SessionExpired(Exception):
    """Raised when the loginkey is stale (the API answers 200 with no body)."""


def _post(context, payload: dict) -> dict:
    """POST one message and return its `data`, raising on failure."""
    name = payload.get("messagename")
    resp = context.request.post(config.API_URL, form={"data": json.dumps(payload)})
    if not resp.ok:
        raise RuntimeError(f"HTTP {resp.status} from bridgeitapi for {name}")

    text = resp.text()
    if not text.strip():
        # A dead loginkey produces 200 + empty body rather than an error.
        raise SessionExpired(f"Empty response for {name} - loginkey likely expired.")
    try:
        body = json.loads(text)
    except json.JSONDecodeError as exc:
        raise SessionExpired(f"Non-JSON response for {name}: {text[:120]!r}") from exc

    if not body.get("success"):
        raise RuntimeError(f"{name} failed: {body}")
    return body["data"]


def get_session_loginkey(context, dashboard_loginkey: str) -> str:
    """Exchange the dashboard loginkey for a session loginkey via BootstrapRQ."""
    data = _post(context, {
        "messagename": "BootstrapRQ",
        "credentials": {"loginkey": dashboard_loginkey},
    })
    return data["loginkey"]


def fetch_booking_calendar(context, loginkey: str, start: str, end: str) -> dict:
    """
    Fetch the booking calendar for a date range (YYYY-MM-DD).

    Returns the raw `data` dict, which includes `bookings`, `rooms`,
    `roomtypes`, `closeouts` and `events`.
    """
    return _post(context, {
        "messagename": "BookingCalendarRQ",
        "credentials": {"loginkey": loginkey},
        "startdate": start,
        "enddate": end,
        "countryLocationId": config.COUNTRY_LOCATION_ID,
    })
