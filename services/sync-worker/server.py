"""
HTTP worker for Railway — runs full NightsBridge sync (ScriptTestBLGH) on POST /run.

Env: CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_USER, SITE_PASS, HEADLESS
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

_server_dir = Path(__file__).resolve().parent
_default_scraper = _server_dir / "scraper"

# Which script actually creates the booking. Default is the ADMIN
# Calendar -> "Add Booking" automation (book_nightsbridge_admin.py) — this
# replaces the old guest-widget automation per the switch to admin-form
# booking. The old script (book_nightsbridge.py, proven working in
# production) is left untouched on disk specifically so this is a ONE env var
# away from an instant rollback if the new admin-form automation misbehaves —
# no code change or redeploy needed, just set BOOKING_SCRIPT=book_nightsbridge.py
# on the Render service and restart.
BOOKING_SCRIPT_NAME = os.environ.get("BOOKING_SCRIPT", "book_nightsbridge_admin.py")


def _resolve_scraper_dir() -> Path:
    env_dir = os.environ.get("SCRAPER_DIR")
    if env_dir:
        path = Path(env_dir)
        if path.is_dir():
            return path
    if _default_scraper.is_dir():
        return _default_scraper
    # Local dev: services/sync-worker/server.py → repo root is two levels up
    if len(_server_dir.parents) > 2:
        repo_root = _server_dir.parents[2]
        fallback = repo_root / "public" / "ScriptTestBLGH"
        if fallback.is_dir():
            return fallback
    return _default_scraper


SCRAPER_DIR = _resolve_scraper_dir()
_lock = threading.Lock()
_running = False

# ── Booking idempotency + auto-recovery knobs ────────────────────────────────
# References with a booking run currently in flight IN THIS PROCESS. A second
# trigger for the same reference (double-click, duplicate delivery after a
# cold-start, the sweep racing a late /book) is accepted but NOT run again —
# two concurrent Playwright runs for one reference would book the room twice.
_active_refs: set = set()
_active_refs_lock = threading.Lock()

# Printed to stderr by book_nightsbridge_admin.py IMMEDIATELY BEFORE it clicks
# the "Add Booking" submit button ("pre-submit checklist passed — submitting").
# If a failed run's stderr does NOT contain this marker, the submit was never
# clicked, so NO booking can exist on NightsBridge for that attempt — which is
# exactly the condition under which an automatic retry is double-booking-safe.
# Failures AFTER the marker (verification failed, timeout mid-submit, OOM kill
# late in the run) are ambiguous and are left for the admin, never auto-retried.
_SUBMIT_MARKER = "pre-submit checklist passed"
_MAX_BOOKING_ATTEMPTS = 3   # 1 normal run + up to 2 automatic retries
_RETRY_DELAY_SECONDS = 20   # brief pause so a transient blip (login bounce,
                            # slow SPA render) has time to clear

# Sweep: recover booking_job rows the worker NEVER accepted. The website
# inserts rows with status "pending"; this worker flips them to "processing"
# the moment /book accepts one. A row still "pending" minutes later means the
# trigger never arrived (worker cold start, network blip, the website's
# background fetch killed after the response) — no Playwright run ever started
# for it anywhere, so running it now cannot double-book.
_SWEEP_INTERVAL_SECONDS = 150
_SWEEP_MIN_AGE_SECONDS = 120   # give the normal /book trigger path time to land
_SWEEP_MAX_AGE_HOURS = 48      # never resurrect ancient rows


def _claim_reference(reference: str) -> bool:
    """Mark a reference as in-flight. False = someone else already has it."""
    with _active_refs_lock:
        if reference in _active_refs:
            return False
        _active_refs.add(reference)
        return True


def _release_reference(reference: str) -> None:
    with _active_refs_lock:
        _active_refs.discard(reference)


def _authorized(header: str | None) -> bool:
    secret = os.environ.get("CRON_SECRET", "")
    if not secret:
        return False
    expected = f"Bearer {secret}"
    return header == expected


def _build_env() -> dict:
    """Return a copy of os.environ with all required aliases resolved."""
    env = os.environ.copy()

    # SUPABASE_URL — accept NEXT_PUBLIC_SUPABASE_URL as alias
    if not env.get("SUPABASE_URL"):
        raw = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
        if raw:
            env["SUPABASE_URL"] = raw.replace("/rest/v1/", "").rstrip("/")

    # SUPABASE_SERVICE_ROLE_KEY — if missing, try common alternate names
    if not env.get("SUPABASE_SERVICE_ROLE_KEY"):
        for alias in ("SUPABASE_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"):
            if env.get(alias):
                env["SUPABASE_SERVICE_ROLE_KEY"] = env[alias]
                print(f"[worker] WARNING: Using {alias} as SUPABASE_SERVICE_ROLE_KEY fallback. "
                      "Set SUPABASE_SERVICE_ROLE_KEY directly on Render for proper permissions.")
                break

    env.setdefault("HEADLESS", "true")
    env["PYTHONUNBUFFERED"] = "1"
    return env


def _check_env() -> list[str]:
    """Return list of missing required env var names (using resolved aliases)."""
    env = _build_env()
    missing = []
    for var in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET",
                "SITE_USER", "SITE_PASS"):
        if not env.get(var):
            missing.append(var)
    return missing


_STALE_MINUTES = 21  # If last sync is older than this, bypass cache — let NightsBridge decide


def _check_room_availability(params: dict) -> dict:
    """
    Query Supabase availability_cache before running Playwright.
    Returns {"ok": True} if a room of the requested type is free for all nights.
    Returns {"ok": False, "error": "..."} if fully booked.
    On any DB error, returns {"ok": True} so Playwright can still try — NightsBridge
    is the authoritative source; we only use this to fail fast and give a better UX.

    If the last successful sync is older than _STALE_MINUTES, the cache is bypassed
    entirely so that stale data never causes a false rejection or false approval.
    """
    try:
        from supabase import create_client
        from datetime import date, datetime, timedelta, timezone
    except ImportError:
        return {"ok": True}  # supabase not installed — don't block

    try:
        env = _build_env()
        url = (env.get("SUPABASE_URL") or "").strip()
        key = (env.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
        if not url or not key:
            return {"ok": True}

        sb = create_client(url, key)

        # ── Staleness guard ────────────────────────────────────────────────────
        # If the most recent successful sync is older than _STALE_MINUTES, the
        # availability_cache cannot be trusted. Skip the pre-check and let
        # NightsBridge be the sole gatekeeper.
        try:
            sync_resp = (
                sb.table("sync_run")
                .select("finished_at")
                .eq("ok", True)
                .not_.is_("finished_at", "null")
                .order("finished_at", desc=True)
                .limit(1)
                .execute()
            )
            if not sync_resp.data:
                print("[worker] No successful sync_run found — bypassing stale cache check")
                return {"ok": True}

            last_sync_str = sync_resp.data[0]["finished_at"]
            last_sync = datetime.fromisoformat(last_sync_str.replace("Z", "+00:00"))
            age_minutes = (datetime.now(timezone.utc) - last_sync).total_seconds() / 60
            if age_minutes > _STALE_MINUTES:
                print(
                    f"[worker] Availability cache is {age_minutes:.1f} min old "
                    f"(> {_STALE_MINUTES} min threshold). "
                    "Bypassing pre-check — NightsBridge will be the gatekeeper."
                )
                return {"ok": True}
        except Exception as stale_exc:
            print(f"[worker] Staleness check error (non-blocking): {stale_exc}", file=sys.stderr)
            return {"ok": True}

        room_type_name = params.get("roomTypeName", "")
        checkin = params.get("checkin", "")
        checkout = params.get("checkout", "")

        # Build list of night-dates to check (arrival night through night before checkout)
        start = date.fromisoformat(checkin)
        end = date.fromisoformat(checkout)
        night_dates = []
        d = start
        while d < end:
            night_dates.append(d.isoformat())
            d += timedelta(days=1)

        if not night_dates:
            return {"ok": True}

        # Get the bbrtid for this room type name
        rt_resp = sb.table("room_type").select("bbrtid").eq("rtname", room_type_name).execute()
        if not rt_resp.data:
            # Room type unknown in our DB — let NightsBridge decide
            print(f"[worker] Availability check: room type '{room_type_name}' not in DB, passing through")
            return {"ok": True}

        bbrtid = rt_resp.data[0]["bbrtid"]

        # Get all physical rooms of this type
        rooms_resp = sb.table("room").select("bbroomid").eq("bbrtid", bbrtid).execute()
        if not rooms_resp.data:
            return {"ok": True}

        room_ids = [r["bbroomid"] for r in rooms_resp.data]

        # Check if ANY physical room is available for ALL requested nights.
        # Also track how many cache rows exist for these dates at all: the sync
        # only caches a limited forward window, so a stay beyond that window has
        # ZERO rows — which must be treated as "unknown", NOT "unavailable".
        cache_rows_seen = 0
        for bbroomid in room_ids:
            cache_resp = (
                sb.table("availability_cache")
                .select("check_date,is_available")
                .eq("bbroomid", bbroomid)
                .in_("check_date", night_dates)
                .execute()
            )
            rows = cache_resp.data or []
            cache_rows_seen += len(rows)
            available_nights = {r["check_date"] for r in rows if r["is_available"]}
            if all(night in available_nights for night in night_dates):
                # Found a room that's free the whole stay
                print(f"[worker] Availability OK: bbroomid={bbroomid} free {checkin}–{checkout}")
                return {"ok": True}

        # No cached data for these nights at all → the stay is beyond the synced
        # window. Don't falsely reject it — let NightsBridge be the gatekeeper
        # (same philosophy as the staleness guard above).
        if cache_rows_seen == 0:
            print(
                f"[worker] No availability_cache rows for {checkin}–{checkout} "
                "(beyond synced window) — passing through to NightsBridge"
            )
            return {"ok": True}

        print(f"[worker] Availability FAIL: no '{room_type_name}' free {checkin}–{checkout}")
        return {
            "ok": False,
            "error": (
                f"Sorry, no {room_type_name} is available from {checkin} to {checkout}. "
                "Please choose different dates or a different room type."
            ),
        }

    except Exception as exc:
        # Never block a booking on a DB error — NightsBridge will catch it
        print(f"[worker] Availability check error (non-blocking): {exc}", file=sys.stderr)
        return {"ok": True}


def _supabase_client():
    """Build a Supabase service-role client, or None if unavailable."""
    try:
        from supabase import create_client
    except ImportError:
        return None
    try:
        env = _build_env()
        url = (env.get("SUPABASE_URL") or "").strip()
        key = (env.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
        if not url or not key:
            return None
        return create_client(url, key)
    except Exception as exc:
        print(f"[worker] Supabase client error: {exc}", file=sys.stderr)
        return None


def _already_completed(reference: str) -> str | None:
    """Return the existing booking_id if this reference already has a REAL
    NightsBridge confirmation, else None. Server-side twin of the admin retry
    endpoint's completed-guard: no matter how a duplicate trigger arrives
    (double-click, retried delivery, sweep race), a confirmed booking is never
    run — and therefore never double-booked or overwritten — again."""
    if not reference:
        return None
    try:
        sb = _supabase_client()
        if sb is None:
            return None
        resp = (
            sb.table("booking_job")
            .select("status,booking_id")
            .eq("reference", reference)
            .limit(1)
            .execute()
        )
        row = (resp.data or [None])[0]
        if row and row.get("status") == "completed" and row.get("booking_id"):
            return str(row["booking_id"])
    except Exception as exc:
        # Read failure = can't prove it's completed; let normal flow proceed.
        print(f"[worker] completed-check error ({reference}): {exc}", file=sys.stderr)
    return None


def _site_base_url() -> str:
    """The website's base URL, for pinging it on booking completion. Accepts a
    few common env names; empty string if none set (ping is then skipped)."""
    for name in ("SITE_URL", "PUBLIC_SITE_URL", "NEXT_PUBLIC_SITE_URL", "WEBSITE_URL"):
        val = (os.environ.get(name) or "").strip()
        if val:
            return val.rstrip("/")
    return ""


def _ping_settle_guest_email(reference: str) -> None:
    """Tell the website a booking has RESOLVED so it can send the guest's
    held-back confirmation email — covers the case where the guest finished
    paying before this background job did, so no payment-time trigger or
    browser poll would otherwise catch the completion. Best-effort and fully
    idempotent on the website side; never blocks or crashes the booking thread.
    Skipped (with a one-line log) if no site URL / CRON_SECRET is configured."""
    if not reference:
        return
    base = _site_base_url()
    secret = (os.environ.get("CRON_SECRET") or "").strip()
    if not base or not secret:
        print(f"[worker] booking_job[{reference}] guest-email ping skipped (no SITE_URL/CRON_SECRET)")
        return
    try:
        import urllib.request
        data = json.dumps({"reference": reference}).encode()
        req = urllib.request.Request(
            f"{base}/api/booking/settle-guest-email",
            data=data,
            headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            print(f"[worker] booking_job[{reference}] guest-email ping -> HTTP {resp.status}")
    except Exception as exc:
        print(f"[worker] booking_job[{reference}] guest-email ping failed (non-blocking): {exc}", file=sys.stderr)


def _write_booking_job(reference: str, fields: dict) -> None:
    """Upsert the booking_job row for this reference (async booking status).
    Best-effort — a DB failure here must never crash the booking thread."""
    if not reference:
        return
    try:
        sb = _supabase_client()
        if sb is None:
            print("[worker] booking_job: no Supabase client — cannot record status", file=sys.stderr)
            return
        sb.table("booking_job").upsert({"reference": reference, **fields}, on_conflict="reference").execute()
        print(f"[worker] booking_job[{reference}] -> {fields.get('status')}")
    except Exception as exc:
        print(f"[worker] booking_job write error ({reference}): {exc}", file=sys.stderr)
        return
    # On a RESOLVED outcome (completed or failed), nudge the website to send the
    # guest's confirmation email. Not for interim "processing"/"pending" writes.
    if fields.get("status") in ("completed", "failed"):
        _ping_settle_guest_email(reference)


# Mirrors lib/booking-status.ts's ALLOWED_TRANSITIONS — keep these in sync.
# The worker only ever drives the first three stages (PENDING through
# NIGHTSBRIDGE_VERIFIED) or FAILED; the website drives the rest.
_ALLOWED_TRANSITIONS = {
    "PENDING": ["NIGHTSBRIDGE_BOOKING_CREATED", "AWAITING_PAYMENT", "FAILED"],
    "NIGHTSBRIDGE_BOOKING_CREATED": ["NIGHTSBRIDGE_VERIFIED", "FAILED"],
    "NIGHTSBRIDGE_VERIFIED": ["CONFIRMATION_EMAIL_SENT", "FAILED"],
    "CONFIRMATION_EMAIL_SENT": ["AWAITING_PAYMENT", "FAILED"],
    "AWAITING_PAYMENT": ["PAYMENT_CONFIRMED", "PAYMENT_FAILED", "FAILED"],
    "PAYMENT_FAILED": ["PAYMENT_CONFIRMED", "AWAITING_PAYMENT", "FAILED"],
    "PAYMENT_CONFIRMED": ["BOGA_NOTIFIED", "FAILED"],
    "BOGA_NOTIFIED": ["GUEST_CONFIRMED"],
    "GUEST_CONFIRMED": [],
    "FAILED": [],
}


def _predecessors_of(to_status: str) -> list:
    return [frm for frm, tos in _ALLOWED_TRANSITIONS.items() if to_status in tos]


def _transition_booking_status(reference: str, to_status: str, reason: str | None = None) -> bool:
    """Atomic guarded transition — same compare-and-swap idempotency
    mechanism as lib/booking-status.ts's transitionBookingStatus(). Only
    succeeds if the row's current booking_status is a legal predecessor of
    to_status; returns False (not an error) if some other writer already
    moved it, which is the expected/safe outcome under a race, not a bug."""
    if not reference:
        return False
    try:
        sb = _supabase_client()
        if sb is None:
            return False
        allowed_from = _predecessors_of(to_status)
        resp = (
            sb.table("booking_job")
            .update({
                "booking_status": to_status,
                "booking_status_reason": reason,
                "booking_status_updated_at": _now_iso(),
            })
            .eq("reference", reference)
            .in_("booking_status", allowed_from)
            .execute()
        )
        won = bool(resp.data)
        if won:
            print(f"[worker] booking_status[{reference}] -> {to_status}" + (f" ({reason})" if reason else ""))
            try:
                sb.table("booking_status_history").insert({
                    "reference": reference, "to_status": to_status, "reason": reason,
                }).execute()
            except Exception as hist_exc:
                print(f"[worker] booking_status_history insert failed ({reference}): {hist_exc}", file=sys.stderr)
        else:
            print(f"[worker] booking_status[{reference}] transition to {to_status} REJECTED (not in {allowed_from})")
        return won
    except Exception as exc:
        print(f"[worker] booking_status transition error ({reference} -> {to_status}): {exc}", file=sys.stderr)
        return False


def _now_iso() -> str:
    import datetime
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _attempt_booking(params: dict, book_script: "Path", reference: str) -> tuple:
    """Run the booking script ONCE (blocking, ~50s). Returns
    (fields_for_booking_job, submit_reached).

    submit_reached=True means the script's stderr shows it got as far as
    clicking the Add Booking submit button — after that point a booking MAY
    exist on NightsBridge even though the run failed, so the caller must NOT
    retry (double-booking risk). False means the run provably never submitted
    anything, which makes a retry safe."""
    try:
        proc = subprocess.run(
            [sys.executable, str(book_script), "--params", json.dumps(params)],
            capture_output=True,
            text=True,
            # 340s ceiling — see the matching comment in _handle_book (sync
            # mode) for why this is wide enough for either script.
            timeout=340,
            env=_build_env(),
        )
    except subprocess.TimeoutExpired as exc:
        # TimeoutExpired still carries whatever the script wrote before it was
        # killed (may arrive as bytes even with text=True — normalize).
        stderr = exc.stderr or ""
        if isinstance(stderr, bytes):
            stderr = stderr.decode("utf-8", "replace")
        return {"status": "failed", "error": "Booking timed out"}, _SUBMIT_MARKER in stderr
    except Exception as exc:
        # Process never ran (spawn failure) — nothing was submitted.
        return {"status": "failed", "error": str(exc)[:800]}, False

    submit_reached = _SUBMIT_MARKER in (proc.stderr or "")

    result = {}
    stdout = (proc.stdout or "").strip()
    if stdout:
        try:
            result = json.loads(stdout)
        except json.JSONDecodeError:
            result = {}
    conf = result.get("confirmation") or {}
    # bookingRef/confirmation.bookingId = old guest-widget script's shape.
    # nbid/bookingId at top level = new admin-form script's shape (NBID is
    # NightsBridge's own identifier, confirmed from the
    # /booking-summary/{NBID} URL). Check both so either script's output
    # is read correctly — a naming mismatch here would silently mark a
    # genuinely successful admin booking as failed.
    booking_id = (
        result.get("bookingRef")
        or conf.get("bookingId")
        or result.get("nbid")
        or result.get("bookingId")
        or ""
    ).strip()
    # A REAL NightsBridge booking always has a booking number on its
    # confirmation page. If the script reported ok but we couldn't capture a
    # booking number, the booking did NOT genuinely complete (a false
    # positive from a stray "thank you"/"confirmed" on the page) — treat it
    # as failed so we never tell a guest they're booked when they aren't.
    if result.get("ok") and booking_id:
        # roomName is only present from book_nightsbridge_admin.py (the
        # admin-calendar flow knows the exact physical unit booked, e.g.
        # "Red Room"). The old guest-widget script never learns this —
        # omit the field entirely rather than write an empty string, so
        # downstream code's `room_name ?? room_type_name` fallback works.
        fields = {"status": "completed", "booking_id": booking_id, "error": None}
        room_name = result.get("roomName")
        if room_name:
            fields["room_name"] = room_name
        return fields, submit_reached
    if result.get("ok") and not booking_id:
        err = "Booking could not be confirmed — NightsBridge returned no booking number. Please try again or contact us."
        return {"status": "failed", "error": err}, submit_reached
    err = result.get("error") or (proc.stderr or "").strip()
    if not err:
        # Both stdout and stderr came back empty — the script never
        # reached its own print(json.dumps(...)), which every one of
        # its own return paths does. That combination only happens if
        # the process was killed outright (a negative returncode is
        # "killed by signal N" — -9 is SIGKILL, e.g. an OOM kill) or
        # exited without ever printing (some other crash before main()
        # runs). Surface the exact signal/exit code instead of a blind
        # "Booking failed" so the next occurrence is diagnosable from
        # booking_job.error alone, no log-diving required.
        err = (
            f"Booking failed with no output — subprocess exited with "
            f"returncode={proc.returncode} "
            f"(negative = killed by signal {-proc.returncode if proc.returncode < 0 else 'n/a'}), "
            f"stdout_len={len(proc.stdout or '')}, stderr_len={len(proc.stderr or '')}"
        )
        print(f"[worker] booking_job[{reference}] EMPTY-OUTPUT FAILURE: {err}")
    return {"status": "failed", "error": err[:800]}, submit_reached


def _run_booking_to_db(params: dict, book_script: "Path", reference: str) -> None:
    """Run the booking (with safe automatic retries) and record the outcome in
    booking_job. Runs in a background thread so the HTTP request can return
    immediately — nothing waits on the ~50s Playwright job.

    AUTO-RETRY: a transient failure (login bounce, slow SPA render, early OOM
    kill) used to go straight to status=failed and wait for an admin to click
    Retry. Now, when a failed attempt provably never clicked submit (see
    _SUBMIT_MARKER), the run is retried automatically up to
    _MAX_BOOKING_ATTEMPTS times. Ambiguous failures (submit reached) are still
    written as failed immediately — those genuinely need a human. Only the
    admin-form script is retried: the old guest-widget script already retries
    internally and doesn't print the marker.

    PAY-FIRST: this worker owns ONLY the NightsBridge track — booking_job.status
    ('processing'/'completed'/'failed') plus booking_id/room_name. It must NOT
    touch booking_status: that is the website's payment track (PENDING ->
    AWAITING_PAYMENT -> PAYMENT_CONFIRMED -> ...), which now runs in parallel and
    is often already past AWAITING_PAYMENT by the time this finishes. A stray
    FAILED transition here could wrongly fail a booking the guest already paid
    for. The admin page reads status/booking_id to show 'not yet on NightsBridge'
    and to offer a retry."""
    print(f"[worker] booking_job[{reference}] background thread STARTED (room={params.get('roomTypeName')})")
    global _running
    # Wait comfortably longer than a full sync (now ~75-80s with the 1-year
    # availability window) so a booking that lands during a sync WAITS for it
    # to finish and then runs ALONE, instead of running a second Chromium +
    # a second NightsBridge login concurrently (session clash / OOM -> the
    # booking fails and needs an admin retry). 300s >> sync duration.
    got_lock = _lock.acquire(timeout=300)
    print(f"[worker] booking_job[{reference}] lock acquired={got_lock} — running subprocess now")
    if got_lock:
        _running = True
    try:
        auto_retry_allowed = book_script.name == "book_nightsbridge_admin.py"
        attempt = 0
        while True:
            attempt += 1
            fields, submit_reached = _attempt_booking(params, book_script, reference)
            if fields.get("status") == "completed":
                _write_booking_job(reference, fields)
                return
            if not auto_retry_allowed or submit_reached or attempt >= _MAX_BOOKING_ATTEMPTS:
                if attempt > 1 and fields.get("error"):
                    fields["error"] = f"{fields['error']} (after {attempt} automatic attempts)"[:800]
                if submit_reached:
                    print(
                        f"[worker] booking_job[{reference}] attempt {attempt} failed AFTER submit was "
                        "reached — NOT auto-retrying (a booking may already exist on NightsBridge)"
                    )
                _write_booking_job(reference, fields)
                return
            print(
                f"[worker] booking_job[{reference}] attempt {attempt}/{_MAX_BOOKING_ATTEMPTS} failed "
                f"BEFORE submit ({str(fields.get('error'))[:200]!r}) — retrying in {_RETRY_DELAY_SECONDS}s"
            )
            time.sleep(_RETRY_DELAY_SECONDS)
    except Exception as exc:
        _write_booking_job(reference, {"status": "failed", "error": str(exc)[:800]})
    finally:
        _release_reference(reference)
        if got_lock:
            _running = False
            _lock.release()


def _booking_params_from_context(reference: str, ctx: dict) -> tuple:
    """Rebuild the /book payload from a booking_job row's stored context (the
    full PaymentContext saved at /api/booking/start time) — the Python twin of
    lib/payment-utils.ts's buildWorkerBookingPayload(), including the
    guestName-split fallback for firstname/surname. Returns (params, None) or
    (None, error_message) when required fields can't be recovered."""
    guest_name = str(ctx.get("guestName") or "").strip()
    name_parts = guest_name.split()
    firstname = str(ctx.get("firstname") or (name_parts[0] if name_parts else "")).strip()
    surname = str(ctx.get("surname") or " ".join(name_parts[1:])).strip()
    params = {
        "checkin":       str(ctx.get("checkin") or ""),
        "checkout":      str(ctx.get("checkout") or ""),
        "roomTypeName":  str(ctx.get("roomTypeName") or ""),
        "mealPlanName":  str(ctx.get("mealPlanName") or "Room Only"),
        "adults":        ctx.get("adults") or 2,
        "children1":     ctx.get("children1") or 0,
        "children2":     ctx.get("children2") or 0,
        "firstname":     firstname,
        "surname":       surname,
        "phone":         str(ctx.get("guestPhone") or ""),
        "email":         str(ctx.get("guestEmail") or ""),
        "arrivalTime":   str(ctx.get("arrivalTime") or ""),
        "airline":       str(ctx.get("airline") or ""),
        "flightno":      str(ctx.get("flightno") or ""),
        "notes":         str(ctx.get("notes") or ""),
        "paymentMethod": "bank_transfer",
        "async":         True,
        "reference":     reference,
    }
    # Same required list as _handle_book — a row that would be rejected there
    # can't be recovered here either.
    required = ["checkin", "checkout", "roomTypeName", "mealPlanName",
                "firstname", "surname", "phone", "email"]
    missing = [f for f in required if not params.get(f)]
    if missing:
        return None, f"missing {', '.join(missing)}"
    return params, None


def _sweep_pending_bookings() -> None:
    """One recovery pass: find booking_job rows still status='pending' — i.e.
    created by the website but never ACCEPTED by any worker (/book never
    arrived: worker cold start, network blip, the website's fire-and-forget
    trigger killed after its response). No Playwright run ever started for
    them anywhere, so running them now cannot double-book. Rows a worker
    accepted are 'processing' and are deliberately NOT touched — if one of
    those is stuck, the worker died mid-run and a booking may already exist
    on NightsBridge; that ambiguity stays with the admin."""
    # Recovery is never urgent — if a sync or a live booking is already using
    # the box (512MB — two Chromiums OOM each other), just try the next pass.
    if _running or _lock.locked():
        return

    sb = _supabase_client()
    if sb is None:
        return
    book_script = SCRAPER_DIR / BOOKING_SCRIPT_NAME
    if not book_script.exists():
        return

    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    newest = (now - timedelta(seconds=_SWEEP_MIN_AGE_SECONDS)).isoformat()
    oldest = (now - timedelta(hours=_SWEEP_MAX_AGE_HOURS)).isoformat()

    resp = (
        sb.table("booking_job")
        .select("reference,status,booking_id,context,created_at")
        .eq("status", "pending")
        .lt("created_at", newest)
        .gt("created_at", oldest)
        .order("created_at")
        .limit(3)
        .execute()
    )
    for row in resp.data or []:
        reference = str(row.get("reference") or "")
        if not reference or row.get("booking_id"):
            continue
        if not _claim_reference(reference):
            continue  # a /book trigger for it just landed — let that run own it
        handed_off = False
        try:
            params, err = _booking_params_from_context(reference, row.get("context") or {})
            if params is None:
                # Surface an actionable failure instead of leaving the row
                # silently 'pending' forever.
                _write_booking_job(reference, {
                    "status": "failed",
                    "error": f"Auto-recovery could not rebuild this booking ({err}) — please book it manually on NightsBridge.",
                })
                continue
            avail = _check_room_availability(params)
            if not avail["ok"]:
                _write_booking_job(reference, {"status": "failed", "error": avail["error"]})
                continue
            print(f"[worker] sweep: recovering never-delivered booking {reference} (created {row.get('created_at')})")
            _write_booking_job(reference, {"status": "processing", "error": None})
            handed_off = True  # _run_booking_to_db releases the reference
            _run_booking_to_db(params, book_script, reference)
        except Exception as exc:
            print(f"[worker] sweep: error recovering {reference}: {exc}", file=sys.stderr)
        finally:
            if not handed_off:
                _release_reference(reference)


def _sweep_loop() -> None:
    """Background daemon: run a recovery pass every _SWEEP_INTERVAL_SECONDS for
    as long as the worker process is alive (the 5-minutely sync cron keeps it
    awake on Render, and /api/booking/start pre-warms it on every booking)."""
    while True:
        try:
            _sweep_pending_bookings()
        except Exception as exc:
            print(f"[worker] sweep loop error: {exc}", file=sys.stderr)
        time.sleep(_SWEEP_INTERVAL_SECONDS)


def _run_sync() -> tuple[int, str]:
    missing = _check_env()
    if missing:
        msg = f"Missing required env vars: {', '.join(missing)}. Set them in the Render dashboard."
        print(f"[worker] ERROR: {msg}", file=sys.stderr)
        return 1, msg

    env = _build_env()
    proc = subprocess.run(
        [sys.executable, "main.py"],
        cwd=str(SCRAPER_DIR),
        env=env,
        capture_output=True,
        text=True,
        timeout=int(os.environ.get("SYNC_TIMEOUT_SECONDS", "600")),
    )
    output = (proc.stdout or "") + (proc.stderr or "")
    return proc.returncode, output[-8000:]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print(f"[worker] {self.address_string()} - {fmt % args}")

    def _json(self, status: int, body: dict) -> None:
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        if self.path in ("/", "/health"):
            self._json(200, {"ok": True, "service": "boga-nb-sync-worker"})
            return
        if self.path == "/env-status":
            missing = _check_env()
            self._json(
                200 if not missing else 503,
                {
                    "ok": not missing,
                    "missing": missing,
                    "message": "All env vars set" if not missing else f"Missing: {', '.join(missing)}",
                },
            )
            return
        self._json(404, {"ok": False, "error": "not found"})

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(length) if length else b""

    def do_POST(self) -> None:
        global _running

        if self.path == "/book":
            self._handle_book()
            return

        if self.path == "/manage-booking":
            self._handle_manage_booking()
            return

        if self.path not in ("/run", "/"):
            self._json(404, {"ok": False, "error": "not found"})
            return

        if not _authorized(self.headers.get("Authorization")):
            self._json(401, {"ok": False, "error": "unauthorized"})
            return

        if not _lock.acquire(blocking=False):
            self._json(409, {"ok": False, "error": "sync already running"})
            return

        try:
            if _running:
                self._json(409, {"ok": False, "error": "sync already running"})
                return
            _running = True
            code, output = _run_sync()
            if code == 0:
                self._json(200, {"ok": True, "output": output})
            else:
                self._json(500, {"ok": False, "exit_code": code, "output": output})
        finally:
            _running = False
            _lock.release()

    def _handle_book(self) -> None:
        if not _authorized(self.headers.get("Authorization")):
            self._json(401, {"ok": False, "error": "unauthorized"})
            return

        body = self._read_body()
        try:
            params = json.loads(body)
        except (json.JSONDecodeError, ValueError):
            self._json(400, {"ok": False, "error": "invalid JSON body"})
            return

        required = ["checkin", "checkout", "roomTypeName", "mealPlanName",
                    "firstname", "surname", "phone", "email"]
        missing = [f for f in required if not params.get(f)]
        if missing:
            self._json(400, {"ok": False, "error": f"Missing: {', '.join(missing)}"})
            return

        # ── Idempotency guards (async mode) ─────────────────────────────────
        # These MUST run BEFORE the availability pre-check: once the first run
        # books the room, that room is no longer available — so a duplicate
        # trigger for the same reference (double-click, re-delivered request
        # after a cold start, admin retry racing the sweep) would fail the
        # availability check and overwrite a genuinely COMPLETED booking_job
        # row with status=failed. Guarding first makes any duplicate a no-op.
        if params.get("async") and params.get("reference"):
            reference = params["reference"]
            existing_id = _already_completed(reference)
            if existing_id:
                print(f"[worker] booking_job[{reference}] already completed (booking_id={existing_id}) — duplicate trigger ignored")
                self._json(202, {"ok": True, "accepted": True, "reference": reference,
                                 "alreadyConfirmed": True, "bookingId": existing_id})
                return
            if not _claim_reference(reference):
                print(f"[worker] booking_job[{reference}] already in flight — duplicate trigger ignored")
                self._json(202, {"ok": True, "accepted": True, "reference": reference, "duplicate": True})
                return

        handed_off = False  # True once the booking thread owns the claimed reference
        try:
            # Availability pre-check — fast Supabase query before spinning up Playwright
            avail = _check_room_availability(params)
            if not avail["ok"]:
                # In async mode, record the failure so the website's poll sees it.
                if params.get("async") and params.get("reference"):
                    _write_booking_job(params["reference"], {"status": "failed", "error": avail["error"]})
                    _release_reference(params["reference"])
                self._json(409, {"ok": False, "error": avail["error"]})
                return

            book_script = SCRAPER_DIR / BOOKING_SCRIPT_NAME
            if not book_script.exists():
                if params.get("async") and params.get("reference"):
                    _write_booking_job(params["reference"], {"status": "failed", "error": "Booking script not found"})
                    _release_reference(params["reference"])
                self._json(503, {"ok": False, "error": "Booking script not found"})
                return

            # ── ASYNC MODE ──────────────────────────────────────────────────
            # The website passes async=true + a payment reference. We start the
            # ~50s booking in a BACKGROUND thread, write the outcome to
            # booking_job, and return 202 immediately so no HTTP request ever
            # waits on it. The website polls booking_job for the result.
            if params.get("async") and params.get("reference"):
                reference = params["reference"]
                _write_booking_job(reference, {"status": "processing", "error": None})
                t = threading.Thread(
                    target=_run_booking_to_db,  # releases the claimed reference when done
                    args=(params, book_script, reference),
                    daemon=True,
                )
                t.start()
                handed_off = True
                self._json(202, {"ok": True, "accepted": True, "reference": reference})
                return
        except Exception:
            # Never leave a reference claimed-but-orphaned if anything above
            # threw — but once the thread is running, it owns the claim (its
            # own finally releases it) and we must NOT release it out from
            # under a live Playwright run.
            if not handed_off and params.get("async") and params.get("reference"):
                _release_reference(params["reference"])
            raise

        # ── SYNC MODE (legacy / admin) ──────────────────────────────────────
        # Serialise with the 5-minutely sync: two Playwright/Chromium processes
        # running at once on the free tier starve each other for memory and make
        # a booking crawl past its timeout. Wait (bounded) for any in-progress
        # sync to finish so the booking gets the box to itself and runs fast.
        # If we can't get the lock in time we proceed anyway — never fail a paid
        # booking just because a sync is busy.
        global _running
        got_lock = _lock.acquire(timeout=300)  # wait out a full sync (~75-80s), then run alone
        if got_lock:
            _running = True
        try:
            proc = subprocess.run(
                [sys.executable, str(book_script), "--params", json.dumps(params)],
                capture_output=True,
                text=True,
                # 340s ceiling: generous enough for either script. The old
                # guest-widget script retries internally (up to 3 attempts) on
                # ambiguous/transient failures. The admin-form script
                # (default) does NOT auto-retry — a single real-browser run
                # through several form steps plus verification still needs
                # real headroom, and a wide ceiling costs nothing on failure.
                timeout=340,
                env=_build_env(),
            )
            stdout = proc.stdout.strip()
            if stdout:
                try:
                    result = json.loads(stdout)
                    self._json(200 if result.get("ok") else 500, result)
                    return
                except json.JSONDecodeError:
                    pass
            self._json(500, {"ok": False, "error": proc.stderr or "Booking failed"})
        except subprocess.TimeoutExpired:
            self._json(504, {"ok": False, "error": "Booking timed out after 340 s"})
        except Exception as exc:
            self._json(500, {"ok": False, "error": str(exc)})
        finally:
            if got_lock:
                _running = False
                _lock.release()


    def _handle_manage_booking(self) -> None:
        if not _authorized(self.headers.get("Authorization")):
            self._json(401, {"ok": False, "error": "unauthorized"})
            return

        body = self._read_body()
        try:
            params = json.loads(body)
        except (json.JSONDecodeError, ValueError):
            self._json(400, {"ok": False, "error": "invalid JSON body"})
            return

        booking_ref = params.get("bookingRef")
        action = params.get("action")

        if not booking_ref or action not in ("checkin", "checkout", "confirm"):
            self._json(400, {"ok": False, "error": "bookingRef and action (checkin|checkout) required"})
            return

        manage_script = SCRAPER_DIR / "manage_booking.py"
        if not manage_script.exists():
            self._json(503, {"ok": False, "error": "manage_booking.py not found in scraper"})
            return

        try:
            proc = subprocess.run(
                [sys.executable, str(manage_script),
                 "--booking-ref", str(booking_ref),
                 "--action", action],
                capture_output=True,
                text=True,
                timeout=120,
                env=_build_env(),
            )
            stdout = proc.stdout.strip()
            if stdout:
                try:
                    result = json.loads(stdout)
                    self._json(200 if result.get("ok") else 500, result)
                    return
                except json.JSONDecodeError:
                    pass
            self._json(500, {"ok": False, "error": proc.stderr or "Action failed"})
        except subprocess.TimeoutExpired:
            self._json(504, {"ok": False, "error": "Action timed out after 120 s"})
        except Exception as exc:
            self._json(500, {"ok": False, "error": str(exc)})


def main() -> None:
    if not SCRAPER_DIR.is_dir():
        print(f"Scraper not found at {SCRAPER_DIR}", file=sys.stderr)
        sys.exit(1)

    # Warn on startup about any missing vars so they appear in Render deploy logs
    missing = _check_env()
    if missing:
        print(
            f"[worker] ⚠️  MISSING ENV VARS: {', '.join(missing)}\n"
            "         Syncs will fail until these are set in the Render dashboard:\n"
            "         SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, SITE_USER, SITE_PASS",
            file=sys.stderr,
        )
    else:
        print("[worker] ✓ All required env vars present")

    # Auto-recovery sweep: picks up booking_job rows the website created but
    # whose /book trigger never arrived (still status='pending'), so a guest's
    # booking goes through WITHOUT an admin having to click Retry. Daemon
    # thread — dies with the process, first pass runs immediately on startup.
    threading.Thread(target=_sweep_loop, daemon=True, name="booking-sweep").start()

    port = int(os.environ.get("PORT", "8080"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Sync worker listening on :{port} (scraper: {SCRAPER_DIR})")
    server.serve_forever()


if __name__ == "__main__":
    main()
