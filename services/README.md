# Background services

Services in this folder run **outside** the Next.js app (not served from `public/`).

## NightsBridge sync (`nightsbridge-sync/`)

Polls the property's own NightsBridge account and exports bookings to `output/` as JSON and CSV. See `nightsbridge-sync/README.md` and `nightsbridge-sync/NIGHTSBRIDGE_INTEGRATION.md` for details.

### First-time setup

```bash
npm run sync:nightsbridge:setup
# Edit services/nightsbridge-sync/.env with SITE_USER and SITE_PASS
```

### Run once

```bash
npm run sync:nightsbridge:once
```

### Run as a background worker (loops every 60 min by default)

```bash
npm run sync:nightsbridge:worker
```

Set `SYNC_INTERVAL_MINUTES` in `.env` to change the interval.

### Production scheduling

On a server, prefer **cron** or **systemd** calling the one-shot command:

```cron
# Every hour at :05
5 * * * * cd /path/to/boga-legaba-website/services/nightsbridge-sync && .venv/bin/python worker.py --once >> logs/sync.log 2>&1
```

**Security:** `.env`, `storage_state.json`, and `output/` contain credentials and guest PII — never commit them.

### Supabase sync

After running `supabase/schema.sql` in your Supabase project, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `services/nightsbridge-sync/.env`. Each sync upserts bookings and rebuilds `availability_cache` for the website API.

See `supabase/README.md` for full setup.
