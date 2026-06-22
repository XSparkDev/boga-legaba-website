-- Boga Legaba — NightsBridge mirror schema (bbid 21091)
-- Run in Supabase SQL Editor. Service role bypasses RLS; anon reads availability_cache + room only.

-- ---------------------------------------------------------------------------
-- Reference
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property (
  bbid        INTEGER PRIMARY KEY,
  bbname      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_type (
  bbrtid          INTEGER PRIMARY KEY,
  rtname          TEXT,
  rtdesc          TEXT,
  max_adults      INTEGER,
  max_occupancy   INTEGER,
  room_qty        INTEGER,
  private_bathroom BOOLEAN,
  raw             JSONB,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room (
  bbroomid        INTEGER PRIMARY KEY,
  bbrtid          INTEGER REFERENCES room_type(bbrtid),
  bbid            INTEGER NOT NULL DEFAULT 21091 REFERENCES property(bbid),
  room_name       TEXT NOT NULL,
  property_name   TEXT,
  address         TEXT,
  configuration   TEXT,
  bathroom_type   TEXT,
  order_by        INTEGER,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_property_name ON room (property_name);
CREATE INDEX IF NOT EXISTS idx_room_room_name ON room (room_name);
CREATE INDEX IF NOT EXISTS idx_room_is_active ON room (is_active) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- Guests & bookings (PII — service role only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guest (
  guestid     BIGINT PRIMARY KEY,
  bbguestid   BIGINT,
  title       TEXT,
  first_name  TEXT,
  surname     TEXT,
  email       TEXT,
  phone       TEXT,
  company     TEXT,
  first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now()
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

CREATE INDEX IF NOT EXISTS idx_booking_dates ON booking (from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_booking_cancelled ON booking (is_cancelled);

CREATE TABLE IF NOT EXISTS booking_room_stay (
  bookingid     BIGINT NOT NULL REFERENCES booking(bookingid) ON DELETE CASCADE,
  bbroomid      INTEGER NOT NULL REFERENCES room(bbroomid),
  guestid       BIGINT REFERENCES guest(guestid),
  adults        INTEGER,
  children_1    INTEGER,
  children_2    INTEGER,
  avg_rate      NUMERIC(12, 2),
  checked_in    BOOLEAN DEFAULT false,
  checked_out   BOOLEAN DEFAULT false,
  PRIMARY KEY (bookingid, bbroomid)
);

CREATE INDEX IF NOT EXISTS idx_stay_room ON booking_room_stay (bbroomid);

-- ---------------------------------------------------------------------------
-- Public-facing availability (website reads this)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS availability_cache (
  bbroomid      INTEGER NOT NULL REFERENCES room(bbroomid) ON DELETE CASCADE,
  check_date    DATE NOT NULL,
  is_available  BOOLEAN NOT NULL DEFAULT true,
  status        TEXT,
  booking_ref   INTEGER,
  rate          NUMERIC(12, 2),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bbroomid, check_date)
);

CREATE INDEX IF NOT EXISTS idx_availability_date ON availability_cache (check_date);
CREATE INDEX IF NOT EXISTS idx_availability_available ON availability_cache (check_date, is_available);

-- ---------------------------------------------------------------------------
-- Closeouts, audit, sync runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS closeout (
  id          BIGSERIAL PRIMARY KEY,
  bbroomid    INTEGER REFERENCES room(bbroomid),
  from_date   DATE NOT NULL,
  to_date     DATE NOT NULL,
  reason      TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_change_log (
  id            BIGSERIAL PRIMARY KEY,
  bookingid     BIGINT,
  change_type   TEXT NOT NULL,
  diff          JSONB,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_run (
  id              BIGSERIAL PRIMARY KEY,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  window_from     DATE,
  window_to       DATE,
  bookings_seen   INTEGER DEFAULT 0,
  inserted        INTEGER DEFAULT 0,
  updated         INTEGER DEFAULT 0,
  cancelled       INTEGER DEFAULT 0,
  ok              BOOLEAN DEFAULT false,
  error           TEXT
);

-- Seed property
INSERT INTO property (bbid, bbname)
VALUES (21091, 'Boga Legaba Guest House & Conference Centre')
ON CONFLICT (bbid) DO UPDATE SET bbname = EXCLUDED.bbname;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE property ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE room ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_room_stay ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE closeout ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_run ENABLE ROW LEVEL SECURITY;

-- Public read: availability + room catalog
DROP POLICY IF EXISTS "anon_select_availability_cache" ON availability_cache;
CREATE POLICY "anon_select_availability_cache"
  ON availability_cache FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_select_room" ON room;
CREATE POLICY "anon_select_room"
  ON room FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "anon_select_room_type" ON room_type;
CREATE POLICY "anon_select_room_type"
  ON room_type FOR SELECT
  TO anon, authenticated
  USING (true);

-- No anon/authenticated policies on PII tables → denied (service_role bypasses RLS)
