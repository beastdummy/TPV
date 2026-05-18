-- =============================================================================
-- 015 — Default operational warehouse
-- =============================================================================

ALTER TABLE warehouses
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS warehouses_one_default_uidx
  ON warehouses ((TRUE))
  WHERE is_default = TRUE;
