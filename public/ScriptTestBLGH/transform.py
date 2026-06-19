"""
Turn the raw BookingCalendarRQ payload into clean, flat records.

A single booking can occupy several rooms, so we emit one row per room-stay
(the most useful shape for CSV) with the booking-level fields repeated. Room
ids are resolved to room names, and the status letter to its description.
"""

from __future__ import annotations

import config


def flatten_bookings(data: dict) -> list[dict]:
    rooms_by_id = {r["bbroomid"]: r["roomname"] for r in data.get("rooms", [])}

    records: list[dict] = []
    for b in data.get("bookings", []):
        booking_base = {
            "booking_id": b.get("bookingid"),
            "booking_ref": b.get("bbbookingid"),
            "status": b.get("status"),
            "status_text": config.STATUS_CODES.get(b.get("status"), b.get("status")),
            "booking_type": b.get("bookingtype"),
            "source": b.get("source"),
            "booked_on": b.get("bookingdate"),
            "from_date": b.get("fromdate"),
            "to_date": b.get("todate"),
            "made_by": b.get("madebytext"),
            "made_by_email": b.get("madebyemail"),
            "made_by_phone": b.get("madebyphoneno"),
            "notes": b.get("notes"),
        }

        stays = b.get("rooms") or [{}]
        for s in stays:
            records.append({
                **booking_base,
                "room_name": rooms_by_id.get(s.get("bbroomid")),
                "guest_first_name": s.get("firstname"),
                "guest_surname": s.get("surname"),
                "guest_email": s.get("email"),
                "guest_phone": s.get("phoneno"),
                "company": s.get("company"),
                "adults": s.get("noadults"),
                "children_1": s.get("child1"),
                "children_2": s.get("child2"),
                "avg_rate": round(s["avgrate"], 2) if s.get("avgrate") is not None else None,
                "checked_in": s.get("checkedin"),
                "checked_out": s.get("checkedout"),
            })

    return records
