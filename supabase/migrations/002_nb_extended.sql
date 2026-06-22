-- NightsBridge extended schema: raw payloads, events, media, audit snapshots
-- Run in Supabase SQL Editor after schema.sql

ALTER TABLE property
  ADD COLUMN IF NOT EXISTS raw JSONB,
  ADD COLUMN IF NOT EXISTS roomtypemode BOOLEAN,
  ADD COLUMN IF NOT EXISTS booking_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE room
  ADD COLUMN IF NOT EXISTS raw JSONB;

ALTER TABLE room_type
  ADD COLUMN IF NOT EXISTS room_size_sqm NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS rate_scheme TEXT,
  ADD COLUMN IF NOT EXISTS ota_room_type_code TEXT,
  ADD COLUMN IF NOT EXISTS type_order_by INTEGER;

CREATE TABLE IF NOT EXISTS calendar_event (
  id            BIGSERIAL PRIMARY KEY,
  bbid          INTEGER REFERENCES property(bbid),
  event_date    DATE,
  title         TEXT,
  description   TEXT,
  raw           JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
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

CREATE TABLE IF NOT EXISTS media_asset (
  id              BIGSERIAL PRIMARY KEY,
  bbroomid        INTEGER REFERENCES room(bbroomid) ON DELETE SET NULL,
  bbid            INTEGER REFERENCES property(bbid) ON DELETE SET NULL,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('room', 'property', 'room_type')),
  entity_key      TEXT NOT NULL,
  source          TEXT NOT NULL CHECK (source IN ('nightsbridge', 'site_catalog', 'upload')),
  source_url      TEXT,
  local_path      TEXT,
  alt_text        TEXT,
  width           INTEGER,
  height          INTEGER,
  sort_order      INTEGER DEFAULT 0,
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  metadata        JSONB,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_asset_unique_source
  ON media_asset (entity_type, entity_key, source, COALESCE(source_url, ''), COALESCE(local_path, ''));

CREATE INDEX IF NOT EXISTS idx_media_asset_room ON media_asset (bbroomid) WHERE bbroomid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_asset_entity ON media_asset (entity_type, entity_key);

ALTER TABLE calendar_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE nb_api_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_asset ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_media_asset" ON media_asset;
CREATE POLICY "anon_select_media_asset"
  ON media_asset FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_select_calendar_event" ON calendar_event;
CREATE POLICY "anon_select_calendar_event"
  ON calendar_event FOR SELECT
  TO anon, authenticated
  USING (true);
