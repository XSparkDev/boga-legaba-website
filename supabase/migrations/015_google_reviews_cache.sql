-- Google Places reviews cache.
-- The website shows Google reviews on the home page. To avoid calling the paid
-- Google Places API on every page view, the server fetches once and stores the
-- result here; it only re-fetches when the cached row is older than 24h
-- (see lib/google-reviews.ts). Keyed by place_id so multiple properties could
-- be cached independently in future.

CREATE TABLE IF NOT EXISTS google_reviews_cache (
  place_id      TEXT PRIMARY KEY,
  rating        NUMERIC(2, 1),          -- overall star rating, e.g. 4.6
  total_ratings INTEGER,               -- userRatingCount
  reviews       JSONB NOT NULL DEFAULT '[]'::jsonb,  -- normalised review objects
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_reviews_fetched ON google_reviews_cache (fetched_at DESC);

-- Reviews are public information shown publicly on the site, so allow public
-- SELECT. Writes happen server-side with the service role (which bypasses RLS).
ALTER TABLE google_reviews_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read google_reviews_cache" ON google_reviews_cache;
CREATE POLICY "Public read google_reviews_cache" ON google_reviews_cache FOR SELECT USING (true);
