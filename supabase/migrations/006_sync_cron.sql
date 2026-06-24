-- 006_sync_cron.sql  (documentation / idempotent reconcile)
--
-- The NightsBridge availability sync is triggered by a pg_cron job that POSTs to
-- the trigger-nightsbridge-sync Edge Function, which proxies to the Render sync
-- worker (/run). The worker scrapes NightsBridge and rebuilds availability_cache
-- so the public calendar stays fresh.
--
-- This job was originally created in the Dashboard (jobid 1,
-- jobname 'trigger-nightsbridge-sync-every-10min'). On 2026-06-24 its cadence was
-- tightened from every 10 min to every 5 min via cron.alter_job.
--
-- IMPORTANT: Booking SAFETY does not depend on this cadence. app/api/book/route.ts
-- performs a live, uncached NightsBridge availability check at the moment of booking
-- (checkRoomTypeAvailableLive), so a slightly stale calendar can never result in a
-- booking on an unavailable room. This cron only keeps the *browsed* calendar current.
--
-- Run this in the Supabase SQL Editor (postgres role) to reconcile the cadence to
-- 5 minutes idempotently, regardless of the current schedule:

do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid
  from cron.job
  where command like '%trigger-nightsbridge-sync%'
  order by jobid
  limit 1;

  if v_jobid is not null then
    perform cron.alter_job(v_jobid, schedule := '*/5 * * * *');
  end if;
end $$;

-- Verify:  select jobid, jobname, schedule, active from cron.job where command like '%trigger-nightsbridge-sync%';
-- History: select jobid, status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
-- Source of truth for whether a sync actually completed is the public.sync_run table.
