-- ─────────────────────────────────────────────────────────────────────────────
-- 004_bookings.sql
-- NightsBridge booking records (synced via get_bookings.py / BridgeIt API)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bookings (
  id                BIGSERIAL PRIMARY KEY,
  booking_id        TEXT       NOT NULL UNIQUE,      -- NightsBridge booking ID
  reference         TEXT,                             -- Guest-facing reference
  status            TEXT,                             -- C, W, P, R, S, O, U
  status_desc       TEXT,                             -- Confirmed, Waiting, …
  guest_name        TEXT,
  guest_email       TEXT,
  guest_phone       TEXT,
  arrive            DATE,
  depart            DATE,
  nights            INTEGER,
  adults            INTEGER,
  children          INTEGER,
  room_name         TEXT,                             -- Physical room name
  room_type_name    TEXT,                             -- NB room type (rtname)
  total             NUMERIC(12, 2),
  deposit_paid      NUMERIC(12, 2),
  balance_due       NUMERIC(12, 2),
  source            TEXT,                             -- e.g. "Direct", "Booking.com"
  notes             TEXT,
  bbid              INTEGER NOT NULL DEFAULT 21091,
  raw_json          TEXT,                             -- Full raw response for debugging
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS bookings_arrive_idx     ON bookings (arrive);
CREATE INDEX IF NOT EXISTS bookings_status_idx     ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_bbid_idx       ON bookings (bbid);
CREATE INDEX IF NOT EXISTS bookings_synced_at_idx  ON bookings (synced_at DESC);

-- Row-level security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Only service role (backend) can read/write bookings — no public access
CREATE POLICY "Service role only" ON bookings
  USING (auth.role() = 'service_role');
