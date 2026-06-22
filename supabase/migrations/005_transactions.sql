-- ─────────────────────────────────────────────────────────────────────────────
-- 005_transactions.sql
-- Payment transactions scraped from NightsBridge dashboard
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id               BIGSERIAL PRIMARY KEY,
  pay_id           BIGINT        NOT NULL UNIQUE,   -- NightsBridge Pay ID
  txn_date         TEXT,                             -- "Fri, 19 Jun 2026 • 04:01"
  gateway          TEXT,                             -- paybridgevcaps | travelit | caps
  booking_ref      TEXT,                             -- NightsBridge booking number
  guest_name       TEXT,
  arriving         TEXT,                             -- "Thu, 18 Jun 2026"
  booking_source   TEXT,                             -- N = NightsBridge, etc.
  success          BOOLEAN  DEFAULT false,
  amount           NUMERIC(12, 2),
  status_code      TEXT,                             -- W, P, F, R, C, S
  status_text      TEXT,
  raw_booking_info TEXT,
  scraped_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Only the service-role key (server-side) can read/write transactions
CREATE POLICY "Service role only – transactions"
  ON transactions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_pay_id     ON transactions (pay_id);
CREATE INDEX IF NOT EXISTS idx_transactions_booking_ref ON transactions (booking_ref);
CREATE INDEX IF NOT EXISTS idx_transactions_scraped_at  ON transactions (scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_gateway     ON transactions (gateway);
