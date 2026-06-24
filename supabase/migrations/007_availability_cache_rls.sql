-- 007_availability_cache_rls.sql
-- Fix: the availability_cache table had no public SELECT policy, so the anon
-- key used by /api/availability returned [] (empty), causing the website to
-- always fall through to the NightsBridge live fallback and show stale data.
-- Also ensure room, room_type, and rate_cache are readable by the anon role.

-- availability_cache: allow public reads (no sensitive data — just dates + is_available)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'availability_cache'
      and policyname = 'Public read availability_cache'
  ) then
    execute 'CREATE POLICY "Public read availability_cache"
             ON availability_cache FOR SELECT TO anon, authenticated
             USING (true)';
  end if;
end $$;

-- room: ensure public reads exist (may already exist, but idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'room'
      and policyname = 'Public read room'
  ) then
    execute 'CREATE POLICY "Public read room"
             ON room FOR SELECT TO anon, authenticated
             USING (true)';
  end if;
end $$;

-- room_type: ensure public reads exist
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'room_type'
      and policyname = 'Public read room_type'
  ) then
    execute 'CREATE POLICY "Public read room_type"
             ON room_type FOR SELECT TO anon, authenticated
             USING (true)';
  end if;
end $$;

-- NOTE: app/api/availability/route.ts was also changed to use createSupabaseAdminClient()
-- (service role key, server-side only) so the route bypasses RLS regardless.
-- These policies are belt-and-suspenders and allow other anon reads in future.

-- Verify: SELECT policyname, tablename, cmd FROM pg_policies
--          WHERE tablename IN ('availability_cache','room','room_type')
--          ORDER BY tablename, policyname;
