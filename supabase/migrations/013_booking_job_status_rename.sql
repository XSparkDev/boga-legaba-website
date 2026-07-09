-- ─────────────────────────────────────────────────────────────────────────────
-- 013_booking_job_status_rename.sql
-- Renames booking_job.status values for clarity: the old "pending"/"booked"
-- names were ambiguous about whether "booked" meant a real, confirmed
-- NightsBridge booking or just "job started". It always meant the former
-- (the worker only writes it after scraping a real booking_id from the
-- confirmation page) — this migration just makes that explicit.
--   pending -> processing
--   booked  -> completed
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE booking_job SET status = 'processing' WHERE status = 'pending';
UPDATE booking_job SET status = 'completed' WHERE status = 'booked';

ALTER TABLE booking_job ALTER COLUMN status SET DEFAULT 'processing';
