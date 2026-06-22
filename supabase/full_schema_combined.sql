-- =============================================================================
-- Boga Legaba Guest House — FULL DATABASE SCHEMA (combined, idempotent)
-- Run this entire script once in the Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS / DO NOTHING everywhere.
-- Last updated: 22 June 2026
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. REFERENCE TABLES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS property (
  bbid        INTEGER PRIMARY KEY,
  bbname      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extra columns added in migration 002
ALTER TABLE property
  ADD COLUMN IF NOT EXISTS raw           JSONB,
  ADD COLUMN IF NOT EXISTS roomtypemode  BOOLEAN,
  ADD COLUMN IF NOT EXISTS booking_url   TEXT,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS room_type (
  bbrtid           INTEGER PRIMARY KEY,
  rtname           TEXT,
  rtdesc           TEXT,
  max_adults       INTEGER,
  max_occupancy    INTEGER,
  room_qty         INTEGER,
  private_bathroom BOOLEAN,
  raw              JSONB,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extra columns added in migration 002
ALTER TABLE room_type
  ADD COLUMN IF NOT EXISTS room_size_sqm     NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS rate_scheme       TEXT,
  ADD COLUMN IF NOT EXISTS ota_room_type_code TEXT,
  ADD COLUMN IF NOT EXISTS type_order_by     INTEGER;

CREATE TABLE IF NOT EXISTS room (
  bbroomid      INTEGER PRIMARY KEY,
  bbrtid        INTEGER REFERENCES room_type(bbrtid),
  bbid          INTEGER NOT NULL DEFAULT 21091 REFERENCES property(bbid),
  room_name     TEXT NOT NULL,
  property_name TEXT,
  address       TEXT,
  configuration TEXT,
  bathroom_type TEXT,
  order_by      INTEGER,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extra column added in migration 002
ALTER TABLE room
  ADD COLUMN IF NOT EXISTS raw JSONB;

CREATE INDEX IF NOT EXISTS idx_room_property_name ON room (property_name);
CREATE INDEX IF NOT EXISTS idx_room_room_name     ON room (room_name);
CREATE INDEX IF NOT EXISTS idx_room_is_active     ON room (is_active) WHERE is_active = true;

-- Seed the property record
INSERT INTO property (bbid, bbname)
VALUES (21091, 'Boga Legaba Guest House & Conference Centre')
ON CONFLICT (bbid) DO UPDATE SET bbname = EXCLUDED.bbname;

-- ---------------------------------------------------------------------------
-- 2. AVAILABILITY CACHE (public read — website uses this)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS availability_cache (
  bbroomid      INTEGER NOT NULL REFERENCES room(bbroomid) ON DELETE CASCADE,
  check_date    DATE    NOT NULL,
  is_available  BOOLEAN NOT NULL DEFAULT true,
  status        TEXT,
  booking_ref   INTEGER,
  rate          NUMERIC(12, 2),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bbroomid, check_date)
);

CREATE INDEX IF NOT EXISTS idx_availability_date      ON availability_cache (check_date);
CREATE INDEX IF NOT EXISTS idx_availability_available ON availability_cache (check_date, is_available);

-- ---------------------------------------------------------------------------
-- 3. MEDIA ASSETS (room + property images from NightsBridge)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS media_asset (
  id           BIGSERIAL PRIMARY KEY,
  bbroomid     INTEGER REFERENCES room(bbroomid)     ON DELETE SET NULL,
  bbid         INTEGER REFERENCES property(bbid)     ON DELETE SET NULL,
  entity_type  TEXT    NOT NULL CHECK (entity_type IN ('room', 'property', 'room_type')),
  entity_key   TEXT    NOT NULL,
  source       TEXT    NOT NULL CHECK (source IN ('nightsbridge', 'site_catalog', 'upload')),
  source_url   TEXT,
  local_path   TEXT,
  alt_text     TEXT,
  width        INTEGER,
  height       INTEGER,
  sort_order   INTEGER DEFAULT 0,
  is_primary   BOOLEAN NOT NULL DEFAULT false,
  metadata     JSONB,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_asset_unique_source
  ON media_asset (entity_type, entity_key, source,
                  COALESCE(source_url, ''), COALESCE(local_path, ''));

CREATE INDEX IF NOT EXISTS idx_media_asset_room   ON media_asset (bbroomid)              WHERE bbroomid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_asset_entity ON media_asset (entity_type, entity_key);

-- ---------------------------------------------------------------------------
-- 4. RATE CACHE (live rates scraped from NightsBridge booking widget)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rate_cache (
  id          BIGSERIAL PRIMARY KEY,
  bbid        INTEGER  NOT NULL,
  rtname      TEXT     NOT NULL,
  rate_single NUMERIC(12, 2),
  rate_double NUMERIC(12, 2),
  available   BOOLEAN  DEFAULT true,
  arrive      DATE     NOT NULL,
  depart      DATE     NOT NULL,
  scraped_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bbid, rtname, arrive, depart)
);

CREATE INDEX IF NOT EXISTS idx_rate_cache_dates   ON rate_cache (bbid, arrive, depart);
CREATE INDEX IF NOT EXISTS idx_rate_cache_scraped ON rate_cache (scraped_at DESC);

-- ---------------------------------------------------------------------------
-- 5. GUESTS & BOOKINGS (PII — service role only)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS guest (
  guestid    BIGINT PRIMARY KEY,
  bbguestid  BIGINT,
  title      TEXT,
  first_name TEXT,
  surname    TEXT,
  email      TEXT,
  phone      TEXT,
  company    TEXT,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking (
  bookingid       BIGINT PRIMARY KEY,
  booking_ref     INTEGER,
  status          CHAR(1),
  status_text     TEXT,
  booking_type    TEXT,
  source          TEXT,
  booked_on       TIMESTAMPTZ,
  from_date       DATE NOT NULL,
  to_date         DATE NOT NULL,
  made_by         TEXT,
  made_by_email   TEXT,
  made_by_phone   TEXT,
  notes           TEXT,
  is_cancelled    BOOLEAN NOT NULL DEFAULT false,
  raw             JSONB,
  first_seen      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_dates     ON booking (from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_booking_cancelled ON booking (is_cancelled);

CREATE TABLE IF NOT EXISTS booking_room_stay (
  bookingid   BIGINT  NOT NULL REFERENCES booking(bookingid) ON DELETE CASCADE,
  bbroomid    INTEGER NOT NULL REFERENCES room(bbroomid),
  guestid     BIGINT  REFERENCES guest(guestid),
  adults      INTEGER,
  children_1  INTEGER,
  children_2  INTEGER,
  avg_rate    NUMERIC(12, 2),
  checked_in  BOOLEAN DEFAULT false,
  checked_out BOOLEAN DEFAULT false,
  PRIMARY KEY (bookingid, bbroomid)
);

CREATE INDEX IF NOT EXISTS idx_stay_room ON booking_room_stay (bbroomid);

-- Bookings table (from get_bookings.py — richer view than the booking table above)
CREATE TABLE IF NOT EXISTS bookings (
  id             BIGSERIAL PRIMARY KEY,
  booking_id     TEXT          NOT NULL UNIQUE,   -- NightsBridge booking ID
  reference      TEXT,
  status         TEXT,                             -- C, W, P, R, S, O, U
  status_desc    TEXT,
  guest_name     TEXT,
  guest_email    TEXT,
  guest_phone    TEXT,
  arrive         DATE,
  depart         DATE,
  nights         INTEGER,
  adults         INTEGER,
  children       INTEGER,
  room_name      TEXT,
  room_type_name TEXT,
  total          NUMERIC(12, 2),
  deposit_paid   NUMERIC(12, 2),
  balance_due    NUMERIC(12, 2),
  source         TEXT,
  notes          TEXT,
  bbid           INTEGER NOT NULL DEFAULT 21091,
  raw_json       TEXT,
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_arrive_idx    ON bookings (arrive);
CREATE INDEX IF NOT EXISTS bookings_status_idx    ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_bbid_idx      ON bookings (bbid);
CREATE INDEX IF NOT EXISTS bookings_synced_at_idx ON bookings (synced_at DESC);

-- ---------------------------------------------------------------------------
-- 6. PAYMENT TRANSACTIONS (scraped from NightsBridge dashboard)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS transactions (
  id               BIGSERIAL    PRIMARY KEY,
  pay_id           BIGINT       NOT NULL UNIQUE,   -- NightsBridge Pay ID
  txn_date         TEXT,                            -- "Fri, 19 Jun 2026 • 04:01"
  gateway          TEXT,                            -- paybridgevcaps | travelit | caps
  booking_ref      TEXT,
  guest_name       TEXT,
  arriving         TEXT,                            -- "Thu, 18 Jun 2026"
  booking_source   TEXT,
  success          BOOLEAN      DEFAULT false,
  amount           NUMERIC(12, 2),
  status_code      TEXT,                            -- W, P, F, R, C, S
  status_text      TEXT,
  raw_booking_info TEXT,
  scraped_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_pay_id      ON transactions (pay_id);
CREATE INDEX IF NOT EXISTS idx_transactions_booking_ref ON transactions (booking_ref);
CREATE INDEX IF NOT EXISTS idx_transactions_scraped_at  ON transactions (scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_gateway     ON transactions (gateway);

-- ---------------------------------------------------------------------------
-- 7. AUDIT / SYNC HELPERS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS closeout (
  id         BIGSERIAL PRIMARY KEY,
  bbroomid   INTEGER REFERENCES room(bbroomid),
  from_date  DATE NOT NULL,
  to_date    DATE NOT NULL,
  reason     TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_change_log (
  id          BIGSERIAL PRIMARY KEY,
  bookingid   BIGINT,
  change_type TEXT NOT NULL,
  diff        JSONB,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_run (
  id             BIGSERIAL PRIMARY KEY,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ,
  window_from    DATE,
  window_to      DATE,
  bookings_seen  INTEGER DEFAULT 0,
  inserted       INTEGER DEFAULT 0,
  updated        INTEGER DEFAULT 0,
  cancelled      INTEGER DEFAULT 0,
  ok             BOOLEAN DEFAULT false,
  error          TEXT
);

CREATE TABLE IF NOT EXISTS calendar_event (
  id          BIGSERIAL PRIMARY KEY,
  bbid        INTEGER REFERENCES property(bbid),
  event_date  DATE,
  title       TEXT,
  description TEXT,
  raw         JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_event_date ON calendar_event (event_date);

CREATE TABLE IF NOT EXISTS nb_api_snapshot (
  id              BIGSERIAL PRIMARY KEY,
  sync_run_id     BIGINT REFERENCES sync_run(id),
  message_name    TEXT NOT NULL DEFAULT 'BookingCalendarRQ',
  window_from     DATE,
  window_to       DATE,
  payload_keys    TEXT[],
  room_count      INTEGER,
  roomtype_count  INTEGER,
  booking_count   INTEGER,
  closeout_count  INTEGER,
  event_count     INTEGER,
  bootstrap_raw   JSONB,
  payload_sample  JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE property            ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_type           ENABLE ROW LEVEL SECURITY;
ALTER TABLE room                ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_cache  ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_asset         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_cache          ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest               ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking             ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_room_stay   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE closeout            ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_change_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_run            ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event      ENABLE ROW LEVEL SECURITY;
ALTER TABLE nb_api_snapshot     ENABLE ROW LEVEL SECURITY;

-- Public (anon + authenticated) can read room catalog + availability + media + rates
DROP POLICY IF EXISTS "anon_select_room"               ON room;
DROP POLICY IF EXISTS "anon_select_room_type"          ON room_type;
DROP POLICY IF EXISTS "anon_select_availability_cache" ON availability_cache;
DROP POLICY IF EXISTS "anon_select_media_asset"        ON media_asset;
DROP POLICY IF EXISTS "anon_select_calendar_event"     ON calendar_event;
DROP POLICY IF EXISTS "Public read rate_cache"         ON rate_cache;

CREATE POLICY "anon_select_room"
  ON room FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "anon_select_room_type"
  ON room_type FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "anon_select_availability_cache"
  ON availability_cache FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "anon_select_media_asset"
  ON media_asset FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "anon_select_calendar_event"
  ON calendar_event FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Public read rate_cache"
  ON rate_cache FOR SELECT
  USING (true);

-- PII tables: service role only (no public access)
DROP POLICY IF EXISTS "Service role only"                ON bookings;
DROP POLICY IF EXISTS "Service role only – transactions" ON transactions;

CREATE POLICY "Service role only"
  ON bookings FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only – transactions"
  ON transactions FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- Done. All tables, indexes, RLS policies created.
-- =============================================================================
