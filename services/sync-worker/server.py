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
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

_server_dir = Path(__file__).resolve().parent
_default_scraper = _server_dir / "scraper"


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


def _run_booking_to_db(params: dict, book_script: "Path", reference: str) -> None:
    """Run the booking script (blocking, ~50s) and record the outcome in
    booking_job. Runs in a background thread so the HTTP request can return
    immediately — nothing waits on the ~50s Playwright job."""
    print(f"[worker] booking_job[{reference}] background thread STARTED (room={params.get('roomTypeName')})")
    global _running
    got_lock = _lock.acquire(timeout=70)
    print(f"[worker] booking_job[{reference}] lock acquired={got_lock} — running subprocess now")
    if got_lock:
        _running = True
    try:
        proc = subprocess.run(
            [sys.executable, str(book_script), "--params", json.dumps(params)],
            capture_output=True,
            text=True,
            # book_nightsbridge.py now retries internally (up to 3 attempts) on
            # ambiguous/transient failures — give it room for that.
            timeout=340,
            env=_build_env(),
        )
        result = {}
        stdout = (proc.stdout or "").strip()
        if stdout:
            try:
                result = json.loads(stdout)
            except json.JSONDecodeError:
                result = {}
        conf = result.get("confirmation") or {}
        booking_id = (result.get("bookingRef") or conf.get("bookingId") or "").strip()
        # A REAL NightsBridge booking always has a booking number on its
        # confirmation page. If the script reported ok but we couldn't capture a
        # booking number, the booking did NOT genuinely complete (a false
        # positive from a stray "thank you"/"confirmed" on the page) — treat it
        # as failed so we never tell a guest they're booked when they aren't.
        if result.get("ok") and booking_id:
            _write_booking_job(reference, {
                "status": "completed",
                "booking_id": booking_id,
                "error": None,
            })
        elif result.get("ok") and not booking_id:
            _write_booking_job(reference, {
                "status": "failed",
                "error": "Booking could not be confirmed — NightsBridge returned no booking number. Please try again or contact us.",
            })
        else:
            err = result.get("error") or (proc.stderr or "").strip() or "Booking failed"
            _write_booking_job(reference, {"status": "failed", "error": err[:800]})
    except subprocess.TimeoutExpired:
        _write_booking_job(reference, {"status": "failed", "error": "Booking timed out"})
    except Exception as exc:
        _write_booking_job(reference, {"status": "failed", "error": str(exc)[:800]})
    finally:
        if got_lock:
            _running = False
            _lock.release()


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

        # Availability pre-check — fast Supabase query before spinning up Playwright
        avail = _check_room_availability(params)
        if not avail["ok"]:
            # In async mode, record the failure so the website's poll sees it.
            if params.get("async") and params.get("reference"):
                _write_booking_job(params["reference"], {"status": "failed", "error": avail["error"]})
            self._json(409, {"ok": False, "error": avail["error"]})
            return

        book_script = SCRAPER_DIR / "book_nightsbridge.py"
        if not book_script.exists():
            if params.get("async") and params.get("reference"):
                _write_booking_job(params["reference"], {"status": "failed", "error": "Booking script not found"})
            self._json(503, {"ok": False, "error": "Booking script not found"})
            return

        # ── ASYNC MODE ──────────────────────────────────────────────────────
        # The website passes async=true + a payment reference. We start the
        # ~50s booking in a BACKGROUND thread, write the outcome to booking_job,
        # and return 202 immediately so no HTTP request ever waits on it. The
        # website polls booking_job for the result.
        if params.get("async") and params.get("reference"):
            reference = params["reference"]
            _write_booking_job(reference, {"status": "processing", "error": None})
            t = threading.Thread(
                target=_run_booking_to_db,
                args=(params, book_script, reference),
                daemon=True,
            )
            t.start()
            self._json(202, {"ok": True, "accepted": True, "reference": reference})
            return

        # ── SYNC MODE (legacy / admin) ──────────────────────────────────────
        # Serialise with the 5-minutely sync: two Playwright/Chromium processes
        # running at once on the free tier starve each other for memory and make
        # a booking crawl past its timeout. Wait (bounded) for any in-progress
        # sync to finish so the booking gets the box to itself and runs fast.
        # If we can't get the lock in time we proceed anyway — never fail a paid
        # booking just because a sync is busy.
        global _running
        got_lock = _lock.acquire(timeout=70)
        if got_lock:
            _running = True
        try:
            proc = subprocess.run(
                [sys.executable, str(book_script), "--params", json.dumps(params)],
                capture_output=True,
                text=True,
                # book_nightsbridge.py now retries internally (up to 3 attempts)
                # on ambiguous/transient failures — give it room for that.
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

    port = int(os.environ.get("PORT", "8080"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Sync worker listening on :{port} (scraper: {SCRAPER_DIR})")
    server.serve_forever()


if __name__ == "__main__":
    main()
