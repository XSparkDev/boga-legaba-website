# Disable local Mac sync (run after Railway + Supabase Edge schedule work)

## 1. Remove macOS crontab entries

```bash
crontab -l
```

Delete any lines containing:

- `run-sync.sh`
- `nightsbridge-sync-cron`
- `ScriptTestBLGH`
- `nightsbridge-sync`

```bash
crontab -e
```

## 2. Stop local background worker

If running:

```bash
# Find and stop npm run sync:nightsbridge:worker
pkill -f "worker.py" || true
```

## 3. Confirm cloud sync only

Wait 10–15 minutes after Edge Function schedule is enabled, then:

```sql
SELECT id, started_at, ok FROM sync_run ORDER BY started_at DESC LIMIT 5;
```

New rows should appear without running anything on your Mac.

## 4. Optional — remove from Next.js

Do **not** set `RUN_LOCAL_SYNC=true` in production.
