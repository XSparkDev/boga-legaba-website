-- 021_enquiry_unsubscribe.sql
-- One-click mailing-list unsubscribe (used by /api/unsubscribe, linked from
-- every guest email footer). Staff must exclude unsubscribed addresses from
-- any manual mailings: SELECT ... FROM enquiry WHERE unsubscribed IS NOT TRUE.
-- Run in Supabase SQL Editor (postgres role). Safe to re-run.

ALTER TABLE enquiry ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE enquiry ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_enquiry_unsubscribed ON enquiry (unsubscribed);

-- Verify: SELECT email, type, unsubscribed, unsubscribed_at FROM enquiry WHERE unsubscribed IS TRUE;
