-- ─────────────────────────────────────────────────────────────────────────────
-- 009_booking_extras.sql
-- App-owned data ATTACHED to bookings, kept in NEW separate tables.
--
-- ARCHITECTURE RULE (from the schema audit): the `booking` table is fully owned
-- and overwritten by the NightsBridge sync worker every ~10 minutes. Nothing
-- custom can live on it. So these tables reference a booking only by its numeric
-- `bookingid` (NO foreign key to `booking`, to avoid coupling to a sync-owned,
-- frequently-replaced table) and the app JOINs them in read-only.
-- ─────────────────────────────────────────────────────────────────────────────

-- Marks a booking as a "department" (government/corporate, no upfront payment)
-- vs a normal paying guest.
CREATE TABLE IF NOT EXISTS booking_department (
  id              BIGSERIAL   PRIMARY KEY,
  bookingid       BIGINT,                       -- links to booking.bookingid (synced bookings)
  booking_ref     TEXT,                          -- or a site-generated ref (pre-sync bookings)
  is_department   BOOLEAN     NOT NULL DEFAULT true,
  department_name TEXT,                          -- e.g. "Dept of Health", "Transnet"
  po_number       TEXT,                          -- purchase order / order number
  contact_person  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One department record per booking (whichever key is present).
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_department_bookingid
  ON booking_department (bookingid) WHERE bookingid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_department_ref
  ON booking_department (booking_ref) WHERE booking_ref IS NOT NULL;

-- An invoice attached to a booking (manual or auto-generated).
CREATE TABLE IF NOT EXISTS booking_invoice (
  id           BIGSERIAL   PRIMARY KEY,
  invoice_no   TEXT        NOT NULL UNIQUE,      -- e.g. BL-INV-000123
  bookingid    BIGINT,
  booking_ref  TEXT,
  guest_name   TEXT,
  guest_email  TEXT,
  status       TEXT        NOT NULL DEFAULT 'draft',  -- draft | sent | paid | void
  subtotal     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency     TEXT        NOT NULL DEFAULT 'ZAR',
  notes        TEXT,
  issued_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_invoice_bookingid ON booking_invoice (bookingid);

-- Extra line items on an invoice (breakfast, laundry, late checkout, etc.).
CREATE TABLE IF NOT EXISTS booking_line_item (
  id          BIGSERIAL   PRIMARY KEY,
  invoice_id  BIGINT      NOT NULL REFERENCES booking_invoice (id) ON DELETE CASCADE,
  description TEXT        NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,   -- quantity * unit_price
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_line_item_invoice ON booking_line_item (invoice_id);

-- RLS: service-role (server-side admin) only, like every other private table.
ALTER TABLE booking_department ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_invoice    ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_line_item  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only – booking_department" ON booking_department FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role only – booking_invoice"    ON booking_invoice    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role only – booking_line_item"  ON booking_line_item  FOR ALL USING (auth.role() = 'service_role');
