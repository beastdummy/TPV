-- =============================================================================
-- 014 — Persist step 1 (business details confirmed) reliably
-- =============================================================================

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS setup_business_confirmed_at TIMESTAMPTZ;
