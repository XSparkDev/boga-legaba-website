-- ─────────────────────────────────────────────────────────────────────────────
-- 010_guest_registration.sql
-- Guest-facing digital registration ("check-in") submissions. Its OWN table —
-- links to a booking by bookingid and/or booking_ref, never stored on `booking`.
--
-- Fields mirror the "missing fields" list. Only full_name is required here; the
-- rest are optional until the client confirms which they want to enforce (so we
-- don't invent required fields). Writes happen ONLY through /api/register using
-- the service-role key, so RLS stays service-role-only (table is private).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS guest_registration (
  id                       BIGSERIAL   PRIMARY KEY,
  bookingid                BIGINT,                    -- optional link to booking.bookingid
  booking_ref              TEXT,                      -- optional NightsBridge / site reference
  full_name                TEXT        NOT NULL,
  email                    TEXT,
  phone                    TEXT,
  home_address             TEXT,
  nationality              TEXT,
  id_or_passport           TEXT,
  date_of_birth            DATE,
  vehicle_reg              TEXT,
  num_guests               INTEGER,
  guest_names              TEXT,                      -- names of all guests staying
  emergency_contact_name   TEXT,
  emergency_contact_phone  TEXT,
  purpose                  TEXT,
  signature_ack            BOOLEAN     NOT NULL DEFAULT false,
  submitted_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_registration_bookingid  ON guest_registration (bookingid);
CREATE INDEX IF NOT EXISTS idx_guest_registration_ref        ON guest_registration (booking_ref);
CREATE INDEX IF NOT EXISTS idx_guest_registration_submitted  ON guest_registration (submitted_at DESC);

ALTER TABLE guest_registration ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only – guest_registration"
  ON guest_registration FOR ALL USING (auth.role() = 'service_role');
