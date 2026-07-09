-- ─────────────────────────────────────────────────────────────────────────────
-- 012_booking_job.sql
-- Tracks the async creation of a NightsBridge booking after a successful payment.
--
-- Why: creating a booking is a ~50s Playwright job. Doing it inside the
-- payment-return HTTP request made that request time out (browser / Render
-- proxy / sync-job contention) → guests paid but were never booked. Instead the
-- worker now creates the booking in the BACKGROUND and records the outcome here,
-- keyed by the Paystack reference. The website polls this table so nothing ever
-- waits on a long request.
--
-- Own table, isolated from booking/bookings — same pattern as booking_hold (008).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking_job (
  reference       TEXT        PRIMARY KEY,           -- Paystack payment reference
  status          TEXT        NOT NULL DEFAULT 'processing',  -- processing | completed | failed
  booking_id      TEXT,                              -- NightsBridge booking id on success
  error           TEXT,                              -- failure reason (for staff)
  -- Snapshot of the details the success page needs (so it doesn't depend on
  -- re-reading Paystack metadata):
  guest_name      TEXT,
  guest_email     TEXT,
  checkin         TEXT,
  checkout        TEXT,
  room_type_name  TEXT,
  amount          NUMERIC,
  -- Full PaymentContext so the confirmation/alert emails can be sent once the
  -- booking resolves, without re-reading Paystack:
  context         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  -- Guard so the outcome emails are sent exactly once (the status endpoint may
  -- be polled many times):
  emails_sent     BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_job_status ON booking_job (status);

ALTER TABLE booking_job ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only – booking_job"
  ON booking_job FOR ALL USING (auth.role() = 'service_role');
