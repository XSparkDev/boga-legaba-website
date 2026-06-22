#!/usr/bin/env bash
# Run NightsBridge → Supabase sync from this folder.
set -euo pipefail
cd "$(dirname "$0")"

VENV="${VENV:-../../services/nightsbridge-sync/.venv}"
if [[ ! -d "$VENV" ]]; then
  python3 -m venv .venv
  VENV=".venv"
  source "$VENV/bin/activate"
  pip install -r requirements.txt
  playwright install chromium
else
  source "$VENV/bin/activate"
fi

export HEADLESS="${HEADLESS:-true}"
python3 main.py
