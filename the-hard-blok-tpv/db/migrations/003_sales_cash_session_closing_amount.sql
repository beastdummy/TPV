-- =============================================================================
-- 003 — Arqueo de cierre en cash_sessions (Fase B)
-- =============================================================================
-- Requiere: 002_sales_transaction_foundations.sql
-- =============================================================================

ALTER TABLE cash_sessions
ADD COLUMN IF NOT EXISTS closing_amount NUMERIC(12, 2);

ALTER TABLE cash_sessions
DROP CONSTRAINT IF EXISTS cash_sessions_closing_amount_check;

ALTER TABLE cash_sessions
ADD CONSTRAINT cash_sessions_closing_amount_check
  CHECK (closing_amount IS NULL OR closing_amount >= 0);
