-- 016_room_images.sql
-- Admin-managed photo gallery per physical room, keyed by bbroomid (the same
-- id already used by the `room` table synced from NightsBridge). Lets staff
-- upload/caption/reorder photos for a specific room (e.g. "Flutes") from the
-- admin dashboard, and the public booking flow can fetch them by bbroomid
-- once a guest selects that room.

CREATE TABLE IF NOT EXISTS room_images (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bbroomid      INTEGER     NOT NULL REFERENCES room(bbroomid) ON DELETE CASCADE,
  image_url     TEXT        NOT NULL,
  title         TEXT,
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_images_bbroomid ON room_images (bbroomid, display_order);

ALTER TABLE room_images ENABLE ROW LEVEL SECURITY;

-- Public read — these are marketing photos, no sensitive data. Writes only
-- ever happen server-side via the admin API routes using the service role
-- key (which bypasses RLS entirely), so no anon/authenticated write policy
-- is defined here on purpose.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'room_images'
      and policyname = 'Public read room_images'
  ) then
    execute 'CREATE POLICY "Public read room_images"
             ON room_images FOR SELECT TO anon, authenticated
             USING (true)';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage bucket for the uploaded files themselves
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('room-images', 'room-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read of files in this bucket (so image_url can be a plain public
-- URL rendered directly in <img>/next/image, no signed URLs needed).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and schemaname = 'storage'
      and policyname = 'Public read room-images bucket'
  ) then
    execute 'CREATE POLICY "Public read room-images bucket"
             ON storage.objects FOR SELECT TO anon, authenticated
             USING (bucket_id = ''room-images'')';
  end if;
end $$;

-- Verify: SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('room_images','objects');
--         SELECT * FROM storage.buckets WHERE id = 'room-images';
