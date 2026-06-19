# Boga Legaba — NightsBridge sync worker (Railway)

Runs Playwright sync + Webview image URLs on a schedule triggered by Supabase Edge Function.

## Architecture

```
Supabase Edge (cron */10) → POST /run → this worker → Supabase Postgres
```

## Railway deploy

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. **Settings → Build:**
   - Builder: **Dockerfile**
   - Dockerfile path: `services/sync-worker/Dockerfile`
   - Root directory: repository root (default)
3. **Settings → Networking:** Generate domain → note URL `https://xxx.up.railway.app`
4. **Variables** (required):

| Variable | Example |
|----------|---------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service role JWT |
| `SITE_USER` | NightsBridge username |
| `SITE_PASS` | NightsBridge password |
| `CRON_SECRET` | long random string (same as Supabase Edge + `.env.local`) |
| `HEADLESS` | `true` |

5. Deploy. Test:

```bash
curl -X POST https://YOUR-RAILWAY-URL/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

6. In Supabase → Edge Functions → Secrets:
   - `SYNC_WORKER_URL` = `https://YOUR-RAILWAY-URL/run`
   - `CRON_SECRET` = same value

7. Enable schedule on `trigger-nightsbridge-sync` (every 10 minutes).

## Local Docker test

From repo root:

```bash
docker build -f services/sync-worker/Dockerfile -t boga-nb-sync .
docker run --rm -p 8080:8080 --env-file .env.local \
  -e CRON_SECRET=your-secret \
  -e SUPABASE_URL=https://xxx.supabase.co \
  boga-nb-sync
```

```bash
curl -X POST http://localhost:8080/run -H "Authorization: Bearer your-secret"
```

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | none |
| POST | `/run` | `Authorization: Bearer CRON_SECRET` |
