#!/usr/bin/env bash
# One-shot sync for cron (macOS/Linux). Logs to services/nightsbridge-sync/logs/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SYNC_DIR="$ROOT/services/nightsbridge-sync"
LOG_DIR="$SYNC_DIR/logs"
mkdir -p "$LOG_DIR"

# Load shared secrets from Next.js .env.local when present
if [[ -f "$ROOT/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.local"
  set +a
  export SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL%/rest/v1/}}"
  export SUPABASE_URL="${SUPABASE_URL%/}"
fi

cd "$SYNC_DIR"
exec "$SYNC_DIR/.venv/bin/python" worker.py --once >> "$LOG_DIR/sync-$(date +%Y%m%d).log" 2>&1
