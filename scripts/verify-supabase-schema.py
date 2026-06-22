#!/usr/bin/env python3
"""Check required Supabase tables/columns exist. Run after applying schema SQL."""

from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    from supabase import create_client
except ImportError:
    print("pip install python-dotenv supabase httpx==0.27.2")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env.local")

url = os.environ.get("SUPABASE_URL") or (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").replace("/rest/v1/", "").rstrip("/")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("FAIL: Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local")
    sys.exit(1)

sb = create_client(url, key)
required = [
    ("room", None),
    ("room_type", None),
    ("availability_cache", None),
    ("sync_run", None),
    ("media_asset", None),
    ("nb_api_snapshot", None),
]

ok = True
for table, _ in required:
    try:
        res = sb.table(table).select("*").limit(1).execute()
        print(f"OK: `{table}` exists")
    except Exception as exc:
        print(f"FAIL: table `{table}` — {exc}")
        ok = False

if ok:
    print("\nSchema verification passed.")
    sys.exit(0)
print("\nApply supabase/schema.sql then supabase/migrations/002_nb_extended.sql in SQL Editor.")
sys.exit(1)
