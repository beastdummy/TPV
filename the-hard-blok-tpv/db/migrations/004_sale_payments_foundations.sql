-- =============================================================================
-- 004 — Sale payments foundations (internal snapshot, sin proveedores externos)
-- =============================================================================
-- Requiere: 002_sales_transaction_foundations.sql
-- Aplicar: npm run db:migrate:sales
-- =============================================================================

CREATE TABLE IF NOT EXISTS sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'internal',
  provider_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT sale_payments_amount_check
    CHECK (amount >= 0),
  CONSTRAINT sale_payments_status_check
    CHECK (
      status IN (
        'pending',
        'authorized',
        'completed',
        'failed',
        'refunded',
        'partially_refunded'
      )
    ),
  CONSTRAINT sale_payments_payment_method_check
    CHECK (payment_method IN ('cash', 'card', 'mixed')),
  CONSTRAINT sale_payments_provider_check
    CHECK (provider IN ('internal'))
);

CREATE INDEX IF NOT EXISTS sale_payments_sale_id_idx
  ON sale_payments (sale_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sale_payments_business_status_idx
  ON sale_payments (business_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS sale_payments_business_sale_idx
  ON sale_payments (business_id, sale_id);
