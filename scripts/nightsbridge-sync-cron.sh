#!/usr/bin/env bash
# One-shot full sync (rooms + availability + webview image URLs) for cron.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SYNC_SCRIPT="$ROOT/public/ScriptTestBLGH/run-sync.sh"
LOG_DIR="$ROOT/public/ScriptTestBLGH/output"
mkdir -p "$LOG_DIR"

if [[ -f "$ROOT/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.local"
  set +a
  export SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL%/rest/v1/}}"
  export SUPABASE_URL="${SUPABASE_URL%/}"
fi

exec "$SYNC_SCRIPT" >> "$LOG_DIR/cron-$(date +%Y%m%d).log" 2>&1
