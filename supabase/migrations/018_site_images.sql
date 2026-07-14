-- 018_site_images.sql
-- Admin-editable OVERRIDES for the fixed image slots on the marketing pages
-- (Home hero slides + property cards, Conference, Dining, Attractions,
-- Specials, Gallery). Each row overrides one slot keyed by `image_key` (the
-- same key the code uses, e.g. 'conference', 'specials.extended-stay',
-- 'gallery.chababa-reeds', 'hero.slide.1'). If no row exists for a key, the
-- page falls back to its built-in default (see lib/site-image-slots.ts), so an
-- empty table changes nothing — this is purely additive.

CREATE TABLE IF NOT EXISTS site_images (
  image_key  TEXT        PRIMARY KEY,
  image_url  TEXT        NOT NULL,
  alt        TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE site_images ENABLE ROW LEVEL SECURITY;

-- Public read — these are marketing images shown publicly. Writes only ever
-- happen server-side via the admin API route using the service role key
-- (which bypasses RLS), so no anon/authenticated write policy is defined.
DROP POLICY IF EXISTS "Public read site_images" ON site_images;
CREATE POLICY "Public read site_images" ON site_images FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for the uploaded files
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-images', 'site-images', true)
ON CONFLICT (id) DO NOTHING;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and schemaname = 'storage'
      and policyname = 'Public read site-images bucket'
  ) then
    execute 'CREATE POLICY "Public read site-images bucket"
             ON storage.objects FOR SELECT TO anon, authenticated
             USING (bucket_id = ''site-images'')';
  end if;
end $$;

-- Verify: SELECT * FROM site_images;
--         SELECT * FROM storage.buckets WHERE id = 'site-images';
