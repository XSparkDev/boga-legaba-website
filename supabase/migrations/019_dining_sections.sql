-- 019_dining_sections.sql
-- Admin-editable content for the Dining page cards (Dining, Private Events,
-- Outdoor Venue, Bar, and anything the admin adds later). Each row is one
-- card: title, body copy, icon key, status ('coming-soon' | 'open'), display
-- order, and visibility. The Dining page shows visible rows ordered by
-- sort_order, falling back to built-in defaults if this table is missing or
-- empty - so an empty table changes nothing until the admin saves content.
-- Run in Supabase SQL Editor (postgres role) after 018_site_images.sql.

CREATE TABLE IF NOT EXISTS dining_sections (
  id         TEXT        PRIMARY KEY,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL DEFAULT '',
  icon       TEXT        NOT NULL DEFAULT 'utensils',
  status     TEXT        NOT NULL DEFAULT 'coming-soon',
  sort_order INTEGER     NOT NULL DEFAULT 0,
  visible    BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE dining_sections ENABLE ROW LEVEL SECURITY;

-- Service role only (same pattern as booking_job, 012): the public Dining
-- page reads through a server component with the service key, and all writes
-- go through the admin API route. No anon/authenticated policy is defined.
DROP POLICY IF EXISTS "Service role only – dining_sections" ON dining_sections;
CREATE POLICY "Service role only – dining_sections"
  ON dining_sections FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Seed the four current cards so the admin editor matches the live page.
-- ON CONFLICT DO NOTHING keeps this safe to re-run and never overwrites
-- admin edits.
-- ---------------------------------------------------------------------------
INSERT INTO dining_sections (id, title, body, icon, status, sort_order, visible)
VALUES
  ('dining',
   'Dining',
   'Planned: a relaxed restaurant serving local and contemporary dishes for Boga guests and visitors, once open.',
   'utensils', 'coming-soon', 10, true),
  ('private-events',
   'Private Events',
   'A future Lantana venue for intimate celebrations, corporate functions and milestone occasions.',
   'party', 'coming-soon', 20, true),
  ('outdoor-venue',
   'Outdoor Venue',
   'A landscaped outdoor space planned for daytime gatherings and golden-hour receptions.',
   'outdoor', 'coming-soon', 30, true),
  ('bar',
   'Bar',
   'A welcoming bar planned for after-work drinks, nightcaps and social evenings.',
   'wine', 'coming-soon', 40, true)
ON CONFLICT (id) DO NOTHING;

-- Verify: SELECT id, title, status, sort_order, visible FROM dining_sections ORDER BY sort_order;
