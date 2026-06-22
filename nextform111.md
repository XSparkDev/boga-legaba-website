# nextform111 — Deployment & ops checklist (from Part 4 onward)

> **Purpose:** Step-by-step guide from Supabase Edge Function cron through go-live verification.  
> **Update this file** after each session until everything below is checked off.  
> **Last updated:** Monday, 22 June 2026  
> **Project:** Boga Legaba Guest House · Supabase `tserpdstcpcdivujpswq` · bbid `21091`

---

## Status at a glance

| Area | Status | Notes |
|------|--------|--------|
| Supabase SQL schema | ⬜ / ✅ | Run `supabase/full_schema_combined.sql` if not done |
| Render — sync worker (Docker) | ⬜ / ✅ | `services/sync-worker/Dockerfile` |
| Render — website (Next.js) | ⬜ / ✅ | `npm run build` + `npm start` |
| Supabase Edge Function + cron | ⬜ / ✅ | Part 4 below |
| End-to-end verification | ⬜ / ✅ | Part 5 below |
| Custom domain | ⬜ optional | Part 6 below |

**Render URLs (fill in when deployed):**

| Service | URL |
|---------|-----|
| Sync worker | `https://boga-nb-sync.onrender.com` |
| Website | `https://________________.onrender.com` |
| Sync worker `/run` | `https://boga-nb-sync.onrender.com/run` |

---

## Part 4 — Supabase Edge Function (automatic cron)

This pings your Render sync worker every **10 minutes**.

### 4.1 Install Supabase CLI (Mac, Cursor terminal)

```bash
brew install supabase/tap/supabase
supabase login
```

- [ ] Supabase CLI installed
- [ ] Logged in (`supabase login`)

### 4.2 Link and deploy

From the project folder:

```bash
cd /Users/xspark6/Downloads/boga-legaba-website
supabase link --project-ref tserpdstcpcdivujpswq
supabase functions deploy trigger-nightsbridge-sync
```

- [ ] Project linked
- [ ] Function `trigger-nightsbridge-sync` deployed

**Alternative (script in repo):**

```bash
export SUPABASE_PROJECT_REF=tserpdstcpcdivujpswq
bash scripts/deploy-edge-function.sh
```

### 4.3 Set secrets in Supabase

**Dashboard → Edge Functions → Secrets** (or CLI):

```bash
supabase secrets set SYNC_WORKER_URL=https://boga-nb-sync.onrender.com/run
supabase secrets set CRON_SECRET=bl-sync-cron-2026
```

- [ ] `SYNC_WORKER_URL` set (must end with `/run`)
- [ ] `CRON_SECRET` set

**Important:** `CRON_SECRET` must match:

- Render sync worker env
- Render website env (if using `/api/sync`)
- `.env.local` → `CRON_SECRET`

### 4.4 Enable schedule

**Dashboard → Edge Functions → `trigger-nightsbridge-sync` → Schedules**

- Cron: `*/10 * * * *` (every 10 minutes)

Or confirm in repo: `supabase/config.toml`:

```toml
[functions.trigger-nightsbridge-sync]
schedule = "*/10 * * * *"
```

- [ ] Schedule active in dashboard (not just in config file)

---

## Part 5 — Verify everything works

| Check | How | Done |
|-------|-----|------|
| Website loads | Visit your Render website URL | ⬜ |
| Admin login | `/admin` → password from `ADMIN_PASSWORD` in Render env | ⬜ |
| Sync worker health | `curl https://boga-nb-sync.onrender.com/health` | ⬜ |
| Manual sync | See commands below | ⬜ |
| Cron | Wait 10 min → Render sync worker **Logs** show POST to `/run` | ⬜ |
| Supabase data | Table Editor → `room`, `availability_cache` updated after sync | ⬜ |
| Book page | `/book-now?roomTypeName=...&from=...&to=...&bbid=21091` shows live rates | ⬜ |
| Transactions (optional) | Admin dashboard → Sync from NightsBridge (local dev only unless wired to worker) | ⬜ |

### Manual sync test

```bash
# Health
curl https://boga-nb-sync.onrender.com/health

# Trigger full sync (replace secret if you changed it)
curl -X POST https://boga-nb-sync.onrender.com/run \
  -H "Authorization: Bearer bl-sync-cron-2026"
```

Expected health response:

```json
{"ok": true, "service": "boga-nb-sync-worker"}
```

---

## Part 6 — Custom domain (optional)

1. **Render → website service → Settings → Custom Domains**
2. Add e.g. `www.bogalegaba.co.za`
3. Point DNS at Render (they show the records)

- [ ] Custom domain added for website
- [ ] DNS propagated and HTTPS working

**Sync worker:** `*.onrender.com` is fine for `SYNC_WORKER_URL` — custom domain not required.

---

## Architecture summary

```
Visitors → Render (Next.js website)
                ↓ reads
            Supabase DB

Every 10 min:
  Supabase Edge Function
    → POST Render Docker worker (/run)
      → Playwright scrapes NightsBridge
        → writes to Supabase
```

**Key files:**

| File | Role |
|------|------|
| `supabase/functions/trigger-nightsbridge-sync/index.ts` | Cron alarm → POST worker |
| `supabase/config.toml` | Schedule `*/10 * * * *` |
| `services/sync-worker/Dockerfile` | Docker image for Render |
| `services/sync-worker/server.py` | HTTP server: `/health`, `/run` |
| `public/ScriptTestBLGH/main.py` | Full NightsBridge sync script |
| `supabase/full_schema_combined.sql` | Full DB schema |

---

## Common issues

| Problem | Fix |
|---------|-----|
| Sync worker build fails | Dockerfile path: `services/sync-worker/Dockerfile`, context: repo root |
| `IndexError: 2` on deploy | Fixed in `server.py` — pull latest `qa` / `scrapping` |
| `httpx` conflict on build | Fixed — removed pinned `httpx==0.27.2` from Dockerfile |
| `/run` returns **401** | `CRON_SECRET` mismatch between Render and Supabase |
| `/run` times out | Normal on first run (Playwright login); check Render Logs |
| Free tier slow / fails | Upgrade sync worker to **Starter** — free spins down after ~15 min idle |
| Admin “Sync transactions” fails on live site | Expected on Render Next.js (no Python); run locally or wire to worker later |
| Edge function **502** | Wrong `SYNC_WORKER_URL`, worker asleep, or worker crashed — check `/health` |
| Edge function **503** | `SYNC_WORKER_URL` or `CRON_SECRET` not set in Supabase secrets |
| No data in Supabase after sync | Check Render logs for `SITE_USER` / `SITE_PASS` / `SUPABASE_SERVICE_ROLE_KEY` |

---

## Minimum order of operations

1. [ ] Run SQL in Supabase (`supabase/full_schema_combined.sql`)
2. [ ] Deploy **sync worker** on Render (Docker) → test `/health` and `/run`
3. [ ] Deploy **website** on Render (Node) → set all env vars from `.env.local`
4. [ ] Deploy edge function + set secrets + enable cron (Part 4)
5. [ ] Change `ADMIN_PASSWORD` to something secure (not default)
6. [ ] Test the live site (Part 5)

---

## Render env vars reference

### Sync worker (Docker)

```
CRON_SECRET=bl-sync-cron-2026
SUPABASE_URL=https://tserpdstcpcdivujpswq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from .env.local>
SITE_USER=21091
SITE_PASS=4609
HEADLESS=true
```

### Website (Node)

```
NEXT_PUBLIC_SUPABASE_URL=https://tserpdstcpcdivujpswq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from .env.local>
SUPABASE_SERVICE_ROLE_KEY=<from .env.local>
ADMIN_PASSWORD=<secure>
ADMIN_SECRET=<from .env.local>
CRON_SECRET=bl-sync-cron-2026
SYNC_WORKER_URL=https://boga-nb-sync.onrender.com/run
SITE_USER=21091
SITE_PASS=4609
```

---

## Session log (add entries as you go)

| Date | What you did | Result / next |
|------|----------------|---------------|
| 2026-06-22 | Created `nextform111.md`; Dockerfile httpx fix; `server.py` Docker path fix | Push `qa`/`scrapping`, redeploy sync worker, then Part 4 |
| | | |
| | | |

---

## Still to do after go-live (backlog)

- [ ] Push latest commits: `git push origin qa` and/or `git push origin scrapping`
- [ ] Wire admin “Sync transactions” to call Render worker (instead of local Python)
- [ ] Add `render.yaml` blueprint for repeatable Render deploys
- [ ] Change production `CRON_SECRET` and `ADMIN_PASSWORD` from dev values
- [ ] Optional: Edge function schedule monitoring / alert if sync fails
- [ ] Optional: TripAdvisor, room image sync, rate cache background upsert

---

## Quick commands cheat sheet

```bash
# Local dev
npm run dev

# Deploy edge function
cd /Users/xspark6/Downloads/boga-legaba-website
supabase link --project-ref tserpdstcpcdivujpswq
supabase functions deploy trigger-nightsbridge-sync

# Manual transaction sync (local only)
cd services/nightsbridge-sync
HEADLESS=true .venv/bin/python get_transactions.py

# Manual full sync (local only)
cd public/ScriptTestBLGH
HEADLESS=true python main.py
```

---

*When a section is fully done, change ⬜ to ✅ in the tables above and add a line to the session log.*
