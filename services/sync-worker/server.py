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

REPO_ROOT = Path(__file__).resolve().parents[2]
_default_scraper = Path(__file__).resolve().parent / "scraper"
SCRAPER_DIR = Path(os.environ.get("SCRAPER_DIR", str(_default_scraper)))
if not SCRAPER_DIR.is_dir():
    SCRAPER_DIR = REPO_ROOT / "public" / "ScriptTestBLGH"
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

    def do_POST(self) -> None:
        global _running
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
