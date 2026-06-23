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
from http.server import BaseHTTPRequestHandler, HTTPServer
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


def _run_sync() -> tuple[int, str]:
    env = os.environ.copy()
    if not env.get("SUPABASE_URL") and env.get("NEXT_PUBLIC_SUPABASE_URL"):
        env["SUPABASE_URL"] = env["NEXT_PUBLIC_SUPABASE_URL"].replace("/rest/v1/", "").rstrip("/")
    env.setdefault("HEADLESS", "true")
    env["PYTHONUNBUFFERED"] = "1"

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
        self._json(404, {"ok": False, "error": "not found"})

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(length) if length else b""

    def do_POST(self) -> None:
        global _running

        if self.path == "/book":
            self._handle_book()
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

        book_script = SCRAPER_DIR / "book_nightsbridge.py"
        if not book_script.exists():
            self._json(503, {"ok": False, "error": "Booking script not found"})
            return

        try:
            proc = subprocess.run(
                [sys.executable, str(book_script), "--params", json.dumps(params)],
                capture_output=True,
                text=True,
                timeout=120,
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
            self._json(504, {"ok": False, "error": "Booking timed out after 120 s"})
        except Exception as exc:
            self._json(500, {"ok": False, "error": str(exc)})


def main() -> None:
    if not SCRAPER_DIR.is_dir():
        print(f"Scraper not found at {SCRAPER_DIR}", file=sys.stderr)
        sys.exit(1)

    port = int(os.environ.get("PORT", "8080"))
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Sync worker listening on :{port} (scraper: {SCRAPER_DIR})")
    server.serve_forever()


if __name__ == "__main__":
    main()
