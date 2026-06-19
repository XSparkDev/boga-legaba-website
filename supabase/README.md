# Supabase setup

## 1. Run the schema

Open [Supabase SQL Editor](https://supabase.com/dashboard) → paste and run:

`supabase/schema.sql`

## 2. Configure env

**Next.js** (`.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

**Scraper** (`services/nightsbridge-sync/.env`):

- `NB_USERNAME` / `NB_PASSWORD`
- `SUPABASE_URL` (same as Next.js URL)
- `SUPABASE_SERVICE_ROLE_KEY`

## 3. Run first sync

```bash
cd services/nightsbridge-sync
cp .env.example .env   # fill credentials
bash setup.sh
.venv/bin/python main.py
```

## 4. Test API

```bash
curl "http://localhost:3000/api/rooms"
curl "http://localhost:3000/api/availability?from=2026-06-18&to=2026-06-25"
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "http://localhost:3000/api/bookings?from=2026-06-01&to=2026-12-31"
```

## 5. Cron — where it runs

| Layer | Role |
|-------|------|
| **Supabase Postgres** | Stores bookings, guests, `availability_cache` |
| **Python worker** (`services/nightsbridge-sync`) | Logs in + scrapes + writes to Supabase |
| **Supabase Edge Function schedule** | Optional alarm clock → HTTP POST to worker |
| **macOS cron / `npm run sync:nightsbridge:worker`** | Use **now** until worker is on a server |

Supabase **cannot** run Playwright inside the database. See `services/nightsbridge-sync/CRON.md`.

## Notes

- Guest PII lives in `booking`, `guest`, `booking_room_stay` — RLS blocks anon access.
- Public site reads only `availability_cache` + `room`.
- Point `SYNC_WORKER_URL` at a VPS/worker running `public/ScriptTestBLGH/run-sync.sh`, or schedule that script via host cron.
