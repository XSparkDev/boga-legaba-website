# When & where the NightsBridge sync runs

NightsBridge does **not** call your website when someone books on their engine, an OTA, or a travel agent. There is no “run exactly when they book” hook unless NightsBridge gives you a webhook (they don’t through this bridge). The practical approach is **polling**: log in periodically, pull the calendar, update Supabase.

---

## What you have today

| Piece | Status |
|-------|--------|
| **Credentials** | `SITE_USER` / `SITE_PASS` in `.env.local` (lines 12–13) and `services/nightsbridge-sync/.env` |
| **Supabase** | URL + keys in `.env.local` (GA4 / Resend still placeholders — fine) |
| **Scraper** | `public/ScriptTestBLGH/` — Playwright login + bridgeitapi + webview images |
| **Host cron** | `POST /api/sync` every **10–15 min** (via `SYNC_WORKER_URL`) |

**Important:** Playwright must run on a host with a browser (Mac, VPS, Railway). Point `SYNC_WORKER_URL` at that worker, or run `run-sync.sh` via system cron.

---

## Recommended schedule (bookings from anywhere)

| Option | Interval | Where | Best for |
|--------|----------|-------|----------|
| **A. Background worker** | **Every 10 min** (default) | Your Mac / a small VPS | Development + small property |
| **B. System cron** | **Every 10–15 min** | Same machine | Production on one server |
| **C. Remote worker** | Every 10–15 min | VPS → `POST /api/sync` | Production with `SYNC_WORKER_URL` |

**Why not “on every booking”?** NightsBridge would need to push to you. Without that, the fastest safe pattern is poll every **10–15 minutes** — stale data is at most one interval old. For a guest house, that is usually acceptable.

Do **not** poll faster than every **5 minutes** (login + browser load stresses NightsBridge and may trip limits).

---

## Option A — Keep worker running (easiest on your Mac)

```bash
npm run sync:nightsbridge:setup   # once
npm run sync:nightsbridge:worker  # runs forever, every 10 min
```

Set interval in `services/nightsbridge-sync/.env`:

```env
SYNC_INTERVAL_MINUTES=10
```

Leave a terminal open, or run under `tmux` / `screen`.

---

## Option B — macOS / Linux cron (runs even when terminal closed)

1. Make the script executable:

```bash
chmod +x scripts/nightsbridge-sync-cron.sh
```

2. Edit crontab:

```bash
crontab -e
```

3. Add (every 10 minutes):

```cron
*/10 * * * * /Users/xspark6/Downloads/boga-legaba-website/scripts/nightsbridge-sync-cron.sh
```

Logs: `services/nightsbridge-sync/logs/sync-YYYYMMDD.log`

---

## Option C — Remote worker + `/api/sync`

1. Deploy `public/ScriptTestBLGH` to **Railway**, **Render**, or a **VPS** with Playwright.
2. Expose an endpoint that runs `run-sync.sh` or `python main.py`.
3. In `.env.local` on the Next.js host:

```env
SYNC_WORKER_URL=https://your-worker.example.com/run
CRON_SECRET=<random-long-string>
```

4. Schedule host cron to `POST /api/sync` with `Authorization: Bearer <CRON_SECRET>` every 10–15 minutes.

---

## Manual test (now)

```bash
npm run sync:nightsbridge:once
```

Then check Supabase tables `sync_run`, `availability_cache`, and `room`.

---

## Still placeholders (OK for now)

- `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
- `RESEND_API_KEY`
- `CRON_SECRET` (for secured `POST /api/sync`)

NightsBridge login + Supabase are enough to sync availability for the website APIs.

---

## Supabase cron (yes — but as a *trigger*, not the scraper)

**What you asked:** run cron jobs in Supabase.

**What Supabase can do:**

| Supabase feature | Can it scrape NightsBridge? |
|------------------|----------------------------|
| **pg_cron** (SQL in Postgres) | No — only runs SQL inside your database |
| **Edge Function + Schedule** | No Playwright — but can **HTTP POST** to your sync worker every 10 min |
| **Database** | Yes — **stores** everything the scraper writes |

So: **Supabase is the database + the alarm clock**. The **scraper still runs elsewhere** (your Mac, Railway, VPS) because it needs a real browser to log in.

### What gets stored every sync (using your login)

When `main.py` / `worker.py` runs, it already:

1. Logs into NightsBridge with `SITE_USER` / `SITE_PASS`
2. Pulls bookings from `bridgeitapi`
3. **Upserts into Supabase:** `property`, `room`, `guest`, `booking`, `booking_room_stay`
4. Rebuilds **`availability_cache`** (what `/api/availability` reads)
5. Logs the run in **`sync_run`**

So yes — bookings from NightsBridge, LekkeSlaap, SafariNow, etc. all appear in **your** database after the next poll. We don’t need OTAs to notify you; we read NightsBridge’s calendar, which is the source of truth.

### Set up Supabase-scheduled cron (after worker is hosted)

1. Deploy `supabase/functions/trigger-nightsbridge-sync` (file added in this repo)
2. In Supabase Dashboard → **Edge Functions** → **Secrets**:
   - `SYNC_WORKER_URL` = URL of machine running Python worker
   - `CRON_SECRET` = same secret as worker expects
3. Enable schedule: **every 10 minutes** (or use `supabase/config.toml`)
4. Edge function calls your worker → worker runs Playwright → data lands in Supabase

**Until the worker is on a server:** run locally:

```bash
npm run sync:nightsbridge:worker
```

That still writes to the same Supabase project.

### Why not run the scraper *inside* Supabase?

NightsBridge login uses an Angular website + Playwright + Chromium. Supabase Edge Functions are lightweight Deno sandboxes — no browser, no Python, no Playwright. That’s a hard platform limit, not a choice we made.

**Future option:** store a refreshed `loginkey` in Supabase (updated by the scraper daily); an Edge Function could call `bridgeitapi` directly without Playwright for quick polls — but when the key expires, something with a browser must log in again.

