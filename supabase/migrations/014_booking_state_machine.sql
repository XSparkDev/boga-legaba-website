-- ─────────────────────────────────────────────────────────────────────────────
-- 014_booking_state_machine.sql
-- Explicit, persisted state machine for the full booking pipeline: site
-- booking submitted -> NightsBridge booking created -> NightsBridge verified
-- -> confirmation email sent -> awaiting payment -> payment confirmed ->
-- Boga notified (or FAILED at any point).
--
-- Why: the pipeline has several sequential stages spread across two
-- processes (the Next.js app and the Python worker) and is driven by two
-- independent external triggers (the guest's browser polling, and Paystack's
-- webhook). Before this migration, "what stage is this booking at" was only
-- inferable from a combination of booking_job.status (processing/completed/
-- failed — only covers the NightsBridge-booking phase) plus ad-hoc boolean
-- flags (emails_sent) plus a separate dedup table (payment_email_sent,
-- migration 014's original version, superseded here). That meant no single
-- column answered "what stage is this booking at right now", and recovering
-- from a crash/restart mid-pipeline required reconstructing state from
-- multiple sources. booking_status is now that single source of truth, and
-- every transition is guarded + logged so it's both resumable and auditable.
--
-- booking_job.status (processing/completed/failed) is UNCHANGED and kept —
-- it's specifically the worker's own job-acceptance signal, read by
-- /api/booking/status to know whether to keep polling. booking_status is the
-- broader pipeline state that subsumes and extends past it.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE booking_job ADD COLUMN IF NOT EXISTS booking_status TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE booking_job ADD COLUMN IF NOT EXISTS booking_status_reason TEXT;
ALTER TABLE booking_job ADD COLUMN IF NOT EXISTS booking_status_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_booking_job_booking_status ON booking_job (booking_status);

-- Append-only audit trail: every successful transition, when, and why (or why
-- a failure happened). Lets a disputed booking be reconstructed exactly —
-- "the guest says they paid but got no confirmation" becomes a lookup, not a
-- guess.
CREATE TABLE IF NOT EXISTS booking_status_history (
  id          BIGSERIAL PRIMARY KEY,
  reference   TEXT        NOT NULL REFERENCES booking_job(reference) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT        NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_status_history_reference ON booking_status_history (reference);

ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only – booking_status_history"
  ON booking_status_history FOR ALL USING (auth.role() = 'service_role');

-- Superseded by booking_status's guarded transitions (AWAITING_PAYMENT ->
-- PAYMENT_CONFIRMED is now itself the atomic idempotency claim for the
-- webhook/verify race) — drop the standalone dedup table from the original
-- version of this migration file. Safe: nothing has been deployed against it
-- yet.
DROP TABLE IF EXISTS payment_email_sent;

-- Superseded by the same mechanism: the CONFIRMATION_EMAIL_SENT transition
-- (guarded, atomic) is now the claim for "send the guest pending email",
-- replacing this separate boolean flag.
ALTER TABLE booking_job DROP COLUMN IF EXISTS emails_sent;

-- The exact physical room booked (e.g. "Red Room"), distinct from
-- room_type_name (the category, e.g. "Double Room (Bath only)", used to
-- resolve which units are candidates before booking). Booking now goes
-- straight into NightsBridge's admin calendar for one specific unit, so
-- this is always known for real once a booking succeeds — emails and the
-- guest-facing UI should show this, not the category, wherever the room is
-- displayed. NULL for jobs booked via the old guest-widget script, which
-- never learns the specific unit — callers should fall back to
-- room_type_name in that case.
ALTER TABLE booking_job ADD COLUMN IF NOT EXISTS room_name TEXT;
