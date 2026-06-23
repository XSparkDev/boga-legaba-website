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
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Sync worker listening on :{port} (scraper: {SCRAPER_DIR})")
    server.serve_forever()


if __name__ == "__main__":
    main()
