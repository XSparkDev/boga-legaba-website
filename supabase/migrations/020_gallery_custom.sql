-- 020_gallery_custom.sql
-- Admin-added EXTRA gallery photos (beyond the 9 fixed gallery slots managed
-- via site_images). Each row is one photo: file, label, gallery category,
-- display order, visibility. The Gallery page appends visible rows (in
-- sort_order) after the fixed items, so an empty table changes nothing -
-- purely additive. Run in Supabase SQL Editor (postgres role).

CREATE TABLE IF NOT EXISTS gallery_custom (
  id         TEXT        PRIMARY KEY,
  image_url  TEXT        NOT NULL,
  label      TEXT        NOT NULL DEFAULT '',
  category   TEXT        NOT NULL DEFAULT 'Lantana',
  sort_order INTEGER     NOT NULL DEFAULT 0,
  visible    BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gallery_custom ENABLE ROW LEVEL SECURITY;

-- Service role only (same pattern as booking_job, 012): the public Gallery
-- page reads through a server component with the service key, and all writes
-- go through the admin API route. No anon/authenticated policy is defined.
DROP POLICY IF EXISTS "Service role only – gallery_custom" ON gallery_custom;
CREATE POLICY "Service role only – gallery_custom"
  ON gallery_custom FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Public storage bucket for the uploaded files (mirrors 018_site_images.sql)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-custom', 'gallery-custom', true)
ON CONFLICT (id) DO NOTHING;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and schemaname = 'storage'
      and policyname = 'Public read gallery-custom bucket'
  ) then
    execute 'CREATE POLICY "Public read gallery-custom bucket"
             ON storage.objects FOR SELECT TO anon, authenticated
             USING (bucket_id = ''gallery-custom'')';
  end if;
end $$;

-- Verify: SELECT * FROM gallery_custom ORDER BY sort_order;
--         SELECT * FROM storage.buckets WHERE id = 'gallery-custom';
