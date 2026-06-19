"""
Background worker for the NightsBridge bookings sync.

Runs main.sync on a schedule (default: every 60 minutes). Use --once for a
single run (e.g. cron or manual trigger).

Environment:
  SYNC_INTERVAL_MINUTES  Minutes between runs (default: 60)
  All variables from .env.example (SITE_USER, SITE_PASS, etc.)
"""

from __future__ import annotations

import argparse
import os
import signal
import sys
import time

from dotenv import load_dotenv

load_dotenv()

_running = True


def _handle_signal(*_args: object) -> None:
    global _running
    _running = False


def _interval_seconds() -> int:
    minutes = int(os.environ.get("SYNC_INTERVAL_MINUTES", "60"))
    return max(5, minutes) * 60


def run_once() -> None:
    from main import main

    main()


def run_loop() -> None:
    interval = _interval_seconds()
    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    print(f"NightsBridge sync worker started (every {interval // 60} min). Ctrl+C to stop.")

    while _running:
        try:
            run_once()
        except Exception as exc:
            print(f"Sync failed: {exc}", file=sys.stderr)

        if not _running:
            break

        print(f"Next sync in {interval // 60} minute(s)...")
        for _ in range(interval):
            if not _running:
                break
            time.sleep(1)

    print("NightsBridge sync worker stopped.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NightsBridge background sync worker")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single sync and exit (for cron or manual use)",
    )
    args = parser.parse_args()

    if args.once:
        run_once()
    else:
        run_loop()
