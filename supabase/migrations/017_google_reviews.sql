-- 017_google_reviews.sql
-- Normalised guest-reviews table (one row per review), replacing the never-
-- applied JSONB-blob design in 015_google_reviews_cache.sql. The home page
-- shows these as "Guest Reviews" without any Google branding. `source`
-- distinguishes manually-seeded rows from future live Google Places API
-- syncs so they can be told apart later (see lib/google-reviews.ts).

CREATE TABLE IF NOT EXISTS google_reviews (
  id            BIGSERIAL   PRIMARY KEY,
  author_name   TEXT        NOT NULL,
  rating        SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text   TEXT        NOT NULL,
  relative_time TEXT,
  source        TEXT        NOT NULL DEFAULT 'google',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_reviews_rating ON google_reviews (rating);

ALTER TABLE google_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read google_reviews" ON google_reviews;
CREATE POLICY "Public read google_reviews" ON google_reviews FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- Seed data: manually curated reviews (source = 'manual_seed')
-- Guarded: only inserts if the manual seed rows are not already present,
-- so this whole script is safe to run repeatedly without creating duplicates.
-- ---------------------------------------------------------------------------

INSERT INTO google_reviews (author_name, rating, review_text, relative_time, source)
SELECT v.author_name, v.rating, v.review_text, v.relative_time, 'manual_seed'
FROM (VALUES
  ('Johann Van Rooyen', 5, 'I stayed at Boga Legaba Guest House for 2 weeks in September/October 2025 while teaching at NWU Mahikeng. It is a good guest house in a peaceful area in Mahikeng. Very clean, good food, friendly and professional staff. I really enjoyed the stay and was impressed by Boga Legaba.', '8 months ago'),
  ('Sandisiwe Sipuka', 5, 'Thank to the staff, they are welcoming, friendly and lovely, the hospitality was top-notch. The short guy wow brother I thank you, you served us we didn''t feel like we aren''t home, brother keep it up the good work and we looking forward to come again.', '9 months ago'),
  ('molefqn', 3, 'The staff was nice, they did their best. The stay was nothing secial but the sleeping wasnt great. They need to get new beds, it was so uncomfortable.', 'a year ago'),
  ('llekalake', 5, 'They have a good customer service. They treat customer with respect. The rooms were clean. Keep up the good service', '10 months ago'),
  ('Sipho Toko', 4, 'Good service, clean rooms and peaceful as well. My stay included bed, breakfast and dinner which finishes at 20:30pm. On my 2 nights I had to ask them to put some food for me because I will be late. They obliged they never had a problem. All I''m saying is that this is home away from home.', '3 years ago'),
  ('Palesa Maoeng', 5, 'The staff from Reception very Friendly, the yard is very clean with a beautiful Garden & pool. Delicious food well prepared & presented from Breakfast to dinner. The rooms very clean including the bedding & rooms also spacious. Thank you Team Boga Legaba, our Calabash was our home away from home indeed. We very thankful for your outstanding service.', '4 years ago'),
  ('Timson Mahlangu', 5, 'Kudos to the staff for the excellent service and keeping the room neat. I had a good experience and will definitely visit again', 'a year ago'),
  ('Yolani Goci', 4, 'These lodges are actually nice to spend a night or two in small towns than big hotel chains. I enjoyed my stay at this establishment. Its clean, well kept, small and intimate.', '2 years ago'),
  ('gbarkley2025', 5, 'Excellent service received. I will definitely recommend this place to anyone travelling. It''s very relaxing vibe and quite.', 'a year ago'),
  ('S Kay', 4, 'Luyanda and her colleague working late shift were phenomenal. They accommodated me without a booking and it was an emergency. I loved them. The food was divine.', '3 years ago'),
  ('Naseem Doodha', 3, 'Not a great experience, partly because of loadshedding but low review due to no shower in my room. It was actually booked as a room with a shower. Sent to find my room in the next street by myself, in the dark, no wifi password given and landline doesnt work.', '4 years ago'),
  ('Mo Letsoalo', 3, 'To no fault of their own, the roads are littered with potholes so getting there is a bit of a schlep. Rooms are decent, decent breakfast, bad WiFi reception.', '4 years ago'),
  ('Philisiwe Nkabinde', 5, 'Amazing place to go with family, it''s child friendly and the staff was really nice, nice breakfast and superb environment entirely. Has a great chill out zone and feels like home.', '2 years ago')
) AS v(author_name, rating, review_text, relative_time)
WHERE NOT EXISTS (SELECT 1 FROM google_reviews WHERE source = 'manual_seed');
