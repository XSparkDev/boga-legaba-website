-- Rate cache: live room-type rates scraped from the NightsBridge public booking widget.
-- Run in Supabase SQL Editor after 002_nb_extended.sql.

CREATE TABLE IF NOT EXISTS rate_cache (
  id          BIGSERIAL PRIMARY KEY,
  bbid        INTEGER NOT NULL,
  rtname      TEXT NOT NULL,
  rate_single NUMERIC(12, 2),
  rate_double NUMERIC(12, 2),
  available   BOOLEAN DEFAULT true,
  arrive      DATE NOT NULL,
  depart      DATE NOT NULL,
  scraped_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bbid, rtname, arrive, depart)
);

CREATE INDEX IF NOT EXISTS idx_rate_cache_dates ON rate_cache (bbid, arrive, depart);
CREATE INDEX IF NOT EXISTS idx_rate_cache_scraped ON rate_cache (scraped_at DESC);

ALTER TABLE rate_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read rate_cache" ON rate_cache;
CREATE POLICY "Public read rate_cache" ON rate_cache FOR SELECT USING (true);
