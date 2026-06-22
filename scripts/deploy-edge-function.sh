#!/usr/bin/env bash
# Deploy Supabase Edge Function trigger-nightsbridge-sync (Option B cron alarm).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v supabase &>/dev/null; then
  echo "Install Supabase CLI: https://supabase.com/docs/guides/cli"
  exit 1
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "Set SUPABASE_PROJECT_REF (Dashboard → Settings → General → Reference ID)"
  exit 1
fi

supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase functions deploy trigger-nightsbridge-sync

echo ""
echo "Next steps (Dashboard → Edge Functions):"
echo "  1. Secrets: SYNC_WORKER_URL=https://YOUR-RAILWAY-URL/run"
echo "  2. Secrets: CRON_SECRET=(same as .env.local)"
echo "  3. Schedules: */10 * * * * on trigger-nightsbridge-sync"
