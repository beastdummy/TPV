-- =============================================================================
-- 016 — Hospitality inventory: negative stock, movement types, terminal warehouse
-- =============================================================================

ALTER TABLE product_stock
  ADD COLUMN IF NOT EXISTS minimum_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0;

ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_type_check,
  DROP CONSTRAINT IF EXISTS stock_movements_qty_check,
  DROP CONSTRAINT IF EXISTS stock_movements_prev_qty_check,
  DROP CONSTRAINT IF EXISTS stock_movements_new_qty_check;

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS correlation_id UUID,
  ADD COLUMN IF NOT EXISTS reason_code TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_type_check
    CHECK (movement_type IN (
      'in',
      'out',
      'sale',
      'transfer_in',
      'transfer_out',
      'adjustment_in',
      'adjustment_out',
      'adjustment_set',
      'purchase',
      'adjustment'
    ));

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_qty_check
    CHECK (quantity >= 0);

CREATE INDEX IF NOT EXISTS stock_movements_correlation_idx
  ON stock_movements (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pos_terminal_settings (
  business_id UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  terminal_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL REFERENCES warehouses (id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (business_id, terminal_id)
);

CREATE INDEX IF NOT EXISTS pos_terminal_settings_warehouse_idx
  ON pos_terminal_settings (business_id, warehouse_id);
