"""
Save scraped records to timestamped JSON/CSV and upsert into Supabase.
"""

from __future__ import annotations

import csv
import json
import os
from datetime import date, datetime, timedelta
from typing import Any

import config
from room_catalog import enrich_room

try:
    from supabase import Client, create_client
except ImportError:
    Client = None  # type: ignore
    create_client = None  # type: ignore


def _timestamped_path(extension: str):
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return config.OUTPUT_DIR / f"scrape_{stamp}.{extension}"


def save_json(records: list[dict]) -> str:
    path = _timestamped_path("json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(records)} record(s) to {path}")
    return str(path)


def save_csv(records: list[dict]) -> str | None:
    if not records:
        print("No records to write to CSV.")
        return None
    path = _timestamped_path("csv")
    fieldnames = list(records[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
    print(f"Wrote {len(records)} record(s) to {path}")
    return str(path)


def _supabase_client() -> Client:
    if create_client is None:
        raise RuntimeError("supabase package not installed. Run: pip install supabase==2.4.0")
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    return create_client(url, key)


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value[:10])


def _parse_ts(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace(" ", "T")).isoformat()
    except ValueError:
        return value


def _guest_id(stay: dict, booking_id: int, bbroomid: int) -> int:
    gid = stay.get("guestid") or stay.get("bbguestid")
    if gid:
        return int(gid)
    # Stable synthetic id when NightsBridge omits guestid
    return abs(hash(f"{booking_id}-{bbroomid}")) % (10**15)


def _date_range(start: str, end: str) -> list[date]:
    d = _parse_date(start)
    end_d = _parse_date(end)
    if not d or not end_d:
        return []
    out: list[date] = []
    while d <= end_d:
        out.append(d)
        d += timedelta(days=1)
    return out


def _occupies_night(stay_from: date, stay_to: date, check: date) -> bool:
    """Room is occupied on check_date if stay spans that night (checkout day is free)."""
    return stay_from <= check < stay_to


def sync_to_supabase(data: dict, window_from: str, window_to: str) -> dict[str, int]:
    """
    Upsert property, rooms, bookings, guests, stays; rebuild availability_cache;
    log sync_run. Returns counts dict.
    """
    sb = _supabase_client()
    started = datetime.utcnow().isoformat()
    sync_id: int | None = None
    stats = {"inserted": 0, "updated": 0, "cancelled": 0, "bookings_seen": 0}

    try:
        run_row = sb.table("sync_run").insert({
            "started_at": started,
            "window_from": window_from,
            "window_to": window_to,
            "ok": False,
        }).execute()
        sync_id = run_row.data[0]["id"] if run_row.data else None

        bb = data.get("bb") or {"bbid": 21091, "bbname": "Boga Legaba Guest House & Conference Centre"}
        sb.table("property").upsert({
            "bbid": bb.get("bbid", 21091),
            "bbname": bb.get("bbname", "Boga Legaba Guest House & Conference Centre"),
        }).execute()

        roomtypes = data.get("roomtypes") or {}
        if isinstance(roomtypes, dict):
            for bbrtid, rt in roomtypes.items():
                sb.table("room_type").upsert({
                    "bbrtid": int(bbrtid),
                    "rtname": rt.get("rtname"),
                    "rtdesc": rt.get("rtdesc"),
                    "max_adults": rt.get("maxadults"),
                    "max_occupancy": rt.get("maxoccupancy"),
                    "room_qty": rt.get("roomqty"),
                    "private_bathroom": rt.get("privatebathroom"),
                    "raw": rt,
                    "updated_at": datetime.utcnow().isoformat(),
                }).execute()

        rooms = data.get("rooms") or []
        room_ids: list[int] = []
        valid_bbrtids = {int(k) for k in roomtypes.keys()} if isinstance(roomtypes, dict) else set()
        for r in rooms:
            bbroomid = int(r["bbroomid"])
            room_ids.append(bbroomid)
            name = r.get("roomname") or ""
            meta = enrich_room(name)
            raw_bbrtid = r.get("bbrtid")
            bbrtid = int(raw_bbrtid) if raw_bbrtid not in (None, "", 0) else None
            if bbrtid is not None and bbrtid not in valid_bbrtids:
                bbrtid = None
            sb.table("room").upsert({
                "bbroomid": bbroomid,
                "bbrtid": bbrtid,
                "bbid": bb.get("bbid", 21091),
                "room_name": name,
                "property_name": meta.get("property_name"),
                "address": meta.get("address"),
                "configuration": meta.get("configuration"),
                "bathroom_type": meta.get("bathroom_type"),
                "order_by": r.get("orderby"),
                "is_active": True,
                "updated_at": datetime.utcnow().isoformat(),
            }).execute()

        bookings = data.get("bookings") or []
        stats["bookings_seen"] = len(bookings)
        seen_booking_ids: set[int] = set()

        for b in bookings:
            booking_id = int(b["bookingid"])
            seen_booking_ids.add(booking_id)
            status = b.get("status")
            status_text = config.STATUS_CODES.get(status, status)

            booking_row = {
                "bookingid": booking_id,
                "booking_ref": b.get("bbbookingid"),
                "status": status,
                "status_text": status_text,
                "booking_type": b.get("bookingtype"),
                "source": b.get("source"),
                "booked_on": _parse_ts(b.get("bookingdate")),
                "from_date": b.get("fromdate"),
                "to_date": b.get("todate"),
                "made_by": b.get("madebytext"),
                "made_by_email": b.get("madebyemail"),
                "made_by_phone": b.get("madebyphoneno"),
                "notes": b.get("notes"),
                "is_cancelled": False,
                "raw": b,
                "last_synced": datetime.utcnow().isoformat(),
            }

            existing = sb.table("booking").select("bookingid").eq("bookingid", booking_id).execute()
            if existing.data:
                stats["updated"] += 1
            else:
                stats["inserted"] += 1

            sb.table("booking").upsert(booking_row).execute()

            for stay in b.get("rooms") or []:
                bbroomid = int(stay["bbroomid"])
                gid = _guest_id(stay, booking_id, bbroomid)
                sb.table("guest").upsert({
                    "guestid": gid,
                    "bbguestid": stay.get("bbguestid"),
                    "title": stay.get("title"),
                    "first_name": stay.get("firstname"),
                    "surname": stay.get("surname"),
                    "email": stay.get("email"),
                    "phone": stay.get("phoneno"),
                    "company": stay.get("company"),
                    "last_seen": datetime.utcnow().isoformat(),
                }).execute()

                rate = stay.get("avgrate")
                sb.table("booking_room_stay").upsert({
                    "bookingid": booking_id,
                    "bbroomid": bbroomid,
                    "guestid": gid,
                    "adults": stay.get("noadults"),
                    "children_1": stay.get("child1"),
                    "children_2": stay.get("child2"),
                    "avg_rate": round(rate, 2) if rate is not None else None,
                    "checked_in": stay.get("checkedin", False),
                    "checked_out": stay.get("checkedout", False),
                }).execute()

        # Mark bookings missing from this window sync as cancelled
        window_start = _parse_date(window_from)
        window_end = _parse_date(window_to)
        if window_start and window_end:
            prior = (
                sb.table("booking")
                .select("bookingid")
                .eq("is_cancelled", False)
                .gte("to_date", window_from)
                .lte("from_date", window_to)
                .execute()
            )
            for row in prior.data or []:
                bid = row["bookingid"]
                if bid not in seen_booking_ids:
                    sb.table("booking").update({
                        "is_cancelled": True,
                        "last_synced": datetime.utcnow().isoformat(),
                    }).eq("bookingid", bid).execute()
                    stats["cancelled"] += 1

        # Closeouts
        for c in data.get("closeouts") or []:
            sb.table("closeout").insert({
                "bbroomid": c.get("bbroomid"),
                "from_date": c.get("fromdate") or c.get("from_date"),
                "to_date": c.get("todate") or c.get("to_date"),
                "reason": c.get("reason") or c.get("notes"),
                "updated_at": datetime.utcnow().isoformat(),
            }).execute()

        # Rebuild availability_cache for the window
        _rebuild_availability_cache(sb, data, room_ids, window_from, window_to)

        if sync_id is not None:
            sb.table("sync_run").update({
                "finished_at": datetime.utcnow().isoformat(),
                "bookings_seen": stats["bookings_seen"],
                "inserted": stats["inserted"],
                "updated": stats["updated"],
                "cancelled": stats["cancelled"],
                "ok": True,
                "error": None,
            }).eq("id", sync_id).execute()

        print(f"Supabase sync OK: {stats}")
        return stats

    except Exception as exc:
        if sync_id is not None:
            sb.table("sync_run").update({
                "finished_at": datetime.utcnow().isoformat(),
                "ok": False,
                "error": str(exc)[:2000],
            }).eq("id", sync_id).execute()
        raise


def _rebuild_availability_cache(
    sb: Client,
    data: dict,
    room_ids: list[int],
    window_from: str,
    window_to: str,
) -> None:
    """For each room × date in window, set is_available from active bookings."""
    dates = _date_range(window_from, window_to)
    if not dates or not room_ids:
        return

    # Build occupancy map: (bbroomid, date) -> {status, booking_ref, rate}
    occupancy: dict[tuple[int, date], dict[str, Any]] = {}
    for b in data.get("bookings") or []:
        if b.get("status") == "U":
            continue
        b_from = _parse_date(b.get("fromdate"))
        b_to = _parse_date(b.get("todate"))
        if not b_from or not b_to:
            continue
        ref = b.get("bbbookingid")
        status = b.get("status")
        status_text = config.STATUS_CODES.get(status, status)
        for stay in b.get("rooms") or []:
            bbroomid = int(stay["bbroomid"])
            rate = stay.get("avgrate")
            for d in dates:
                if _occupies_night(b_from, b_to, d):
                    occupancy[(bbroomid, d)] = {
                        "status": status_text,
                        "booking_ref": ref,
                        "rate": round(rate, 2) if rate is not None else None,
                    }

    rows: list[dict] = []
    now = datetime.utcnow().isoformat()
    for bbroomid in room_ids:
        for d in dates:
            occ = occupancy.get((bbroomid, d))
            rows.append({
                "bbroomid": bbroomid,
                "check_date": d.isoformat(),
                "is_available": occ is None,
                "status": occ["status"] if occ else None,
                "booking_ref": occ["booking_ref"] if occ else None,
                "rate": occ["rate"] if occ else None,
                "updated_at": now,
            })

    # Batch upsert (Supabase limit ~1000 rows per request)
    batch_size = 500
    for i in range(0, len(rows), batch_size):
        sb.table("availability_cache").upsert(rows[i : i + batch_size]).execute()

    print(f"Rebuilt availability_cache: {len(rows)} room-night(s).")
