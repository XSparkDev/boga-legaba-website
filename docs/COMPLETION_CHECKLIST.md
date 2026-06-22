# NightsBridge + Supabase — completion checklist (Option B)

Use this after the plan is approved. **No Mac required** once Railway + Supabase schedule are live.

## Architecture

```
Supabase Edge (every 10 min) → POST Railway/worker/run → Supabase DB → Website /stay
```

---

## Phase 1 — Database (you)

- [ ] Run [`supabase/schema.sql`](../supabase/schema.sql) in Supabase SQL Editor (skip if already synced)
- [ ] Run [`supabase/migrations/002_nb_extended.sql`](../supabase/migrations/002_nb_extended.sql)
- [ ] Verify: `python3 scripts/verify-supabase-schema.py` prints all tables OK

---

## Phase 2 — Environment (you)

- [ ] Copy [`.env.example`](../.env.example) → `.env.local` and fill:

| Variable | Where to get it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (secret) |
| `SITE_USER` / `SITE_PASS` | NightsBridge owner login |
| `CRON_SECRET` | Generate a long random string |
| `NB_AUDIT_KEY` | Optional — protects `/admin/nightsbridge` |

---

## Phase 3 — Local sync test (you or agent)

```bash
cd public/ScriptTestBLGH && ./run-sync.sh
```

- [ ] `sync_run` table has a new row with `ok = true`
- [ ] `http://localhost:3000/admin/nightsbridge` shows rooms + counts
- [ ] `http://localhost:3000/stay` shows **Live · Supabase** badges
- [ ] `media_asset` has rows with `source = nightsbridge` (if webview scrape succeeded)

If images fail: `HEADLESS=false ./run-sync.sh`

---

## Phase 4 — Railway worker (you)

See [`services/sync-worker/README.md`](../services/sync-worker/README.md)

- [ ] Create Railway project, Dockerfile path `services/sync-worker/Dockerfile`
- [ ] Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_USER`, `SITE_PASS`, `CRON_SECRET`, `HEADLESS=true`
- [ ] Deploy and copy public URL
- [ ] Test:

```bash
curl -X POST https://YOUR-RAILWAY-URL/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Phase 5 — Supabase Edge Function (you)

- [ ] `chmod +x scripts/deploy-edge-function.sh`
- [ ] `SUPABASE_PROJECT_REF=xxx ./scripts/deploy-edge-function.sh`
- [ ] Dashboard → Edge Functions → Secrets:
  - `SYNC_WORKER_URL` = `https://YOUR-RAILWAY-URL/run`
  - `CRON_SECRET` = same as `.env.local`
- [ ] Enable schedule **every 10 minutes** on `trigger-nightsbridge-sync`
- [ ] Wait 10–15 min → `sync_run` updates without Mac on

---

## Phase 6 — Deploy website (you)

Production env needs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NB_AUDIT_KEY` (optional)

**Do not** enable `RUN_LOCAL_SYNC` in production.

---

## Phase 7 — Disable Mac sync (you)

After Phase 5 works:

- [ ] `crontab -e` — remove any `run-sync.sh` or `nightsbridge-sync-cron` lines
- [ ] Stop `npm run sync:nightsbridge:worker` if running locally

---

## Success criteria

- [ ] `media_asset` table exists and has image URLs
- [ ] Railway `POST /run` returns `ok: true`
- [ ] Supabase cron updates `sync_run` every ~10 min
- [ ] `/stay` works with Mac off
- [ ] No duplicate Mac + cloud sync running

---

## Quick commands

| Task | Command |
|------|---------|
| Verify schema | `python3 scripts/verify-supabase-schema.py` |
| Full sync | `cd public/ScriptTestBLGH && ./run-sync.sh` |
| Cron (if needed on a server) | `scripts/nightsbridge-sync-cron.sh` |
| Deploy Edge Function | `SUPABASE_PROJECT_REF=xxx ./scripts/deploy-edge-function.sh` |
| Audit UI | `/admin/nightsbridge?key=NB_AUDIT_KEY` |

More detail: [`docs/NIGHTSBRIDGE_DATA_FLOW.md`](NIGHTSBRIDGE_DATA_FLOW.md)
