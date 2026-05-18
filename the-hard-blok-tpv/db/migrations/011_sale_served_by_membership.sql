-- =============================================================================
-- 011 — Atribución de venta al empleado TPV (PIN)
-- =============================================================================
-- Requiere: 002_sales_transaction_foundations, 001_tenancy (business_members)
-- Aplicar: npm run db:migrate:sales
-- =============================================================================

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS served_by_membership_id UUID
    REFERENCES business_members (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sales_served_by_membership_idx
  ON sales (served_by_membership_id)
  WHERE served_by_membership_id IS NOT NULL;
