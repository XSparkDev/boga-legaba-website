-- ─────────────────────────────────────────────────────────────────────────────
-- 008_booking_hold.sql
-- Short-lived "soft holds" placed on a room type + date range while a guest is
-- paying, so a second guest can't pay for the same room in the same window.
-- The hold auto-expires (expires_at) if payment isn't completed, releasing the
-- room without any cron — the availability check simply ignores expired rows.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking_hold (
  id             BIGSERIAL   PRIMARY KEY,
  reference      TEXT        NOT NULL UNIQUE,   -- Paystack transaction reference
  bbid           BIGINT      NOT NULL,          -- NightsBridge establishment id
  room_type_name TEXT        NOT NULL,
  checkin        DATE        NOT NULL,
  checkout       DATE        NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,          -- hold is inactive once past this
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE booking_hold ENABLE ROW LEVEL SECURITY;

-- Only the service-role key (server-side) can read/write holds.
CREATE POLICY "Service role only – booking_hold"
  ON booking_hold
  FOR ALL
  USING (auth.role() = 'service_role');

-- Fast lookup of active holds for a room type / date overlap check.
CREATE INDEX IF NOT EXISTS idx_booking_hold_lookup
  ON booking_hold (bbid, room_type_name, expires_at);
CREATE INDEX IF NOT EXISTS idx_booking_hold_expires
  ON booking_hold (expires_at);
