# Supabase setup

## 1. Run the schema

Open [Supabase SQL Editor](https://supabase.com/dashboard) → run in order:

1. [`schema.sql`](schema.sql)
2. [`migrations/002_nb_extended.sql`](migrations/002_nb_extended.sql)

Verify:

```bash
python3 scripts/verify-supabase-schema.py
```

## 2. Configure env

**Next.js** (`.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `SITE_USER` / `SITE_PASS` (NightsBridge)

See [`.env.example`](../.env.example) and [`docs/COMPLETION_CHECKLIST.md`](../docs/COMPLETION_CHECKLIST.md).

## 3. Run first sync

```bash
cd public/ScriptTestBLGH && ./run-sync.sh
```

## 4. Test API

```bash
curl "http://localhost:3000/api/rooms"
curl "http://localhost:3000/api/availability?from=2026-06-18&to=2026-06-25"
```

## 5. Production sync (Option B — no Mac)

| Layer | Role |
|-------|------|
| **Supabase Postgres** | Rooms, availability, `media_asset` URLs |
| **Railway worker** | [`services/sync-worker/`](../services/sync-worker/) — Playwright sync |
| **Supabase Edge Function** | `trigger-nightsbridge-sync` — cron every 10 min → POST Railway |

Deploy steps: [`docs/COMPLETION_CHECKLIST.md`](../docs/COMPLETION_CHECKLIST.md)

## Notes

- Guest PII in `booking` / `guest` — RLS blocks anon.
- Public site reads `room`, `room_type`, `availability_cache`, `media_asset`.
- Disable Mac crontab after Railway + Edge schedule are confirmed.
