-- ─────────────────────────────────────────────────────────────────────────────
-- 011_enquiries.sql
-- Lead-capture form submissions from the public site: conference enquiries,
-- corporate/government booking enquiries, general contact messages, and
-- "register your interest" subscriptions (specials/dining).
--
-- Own table, isolated from booking/bookings — the same pattern as
-- guest_registration (010) and the booking_* extras (009).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS enquiry (
  id          BIGSERIAL   PRIMARY KEY,
  type        TEXT        NOT NULL,   -- conference | corporate | contact | interest
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  phone       TEXT,
  entity      TEXT,                    -- company / department / organisation (conference, corporate)
  message     TEXT,                    -- free-text message/notes/requirements
  details     JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- type-specific fields
  status      TEXT        NOT NULL DEFAULT 'new',        -- new | actioned
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enquiry_type       ON enquiry (type);
CREATE INDEX IF NOT EXISTS idx_enquiry_created_at ON enquiry (created_at DESC);

ALTER TABLE enquiry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only – enquiry"
  ON enquiry FOR ALL USING (auth.role() = 'service_role');
