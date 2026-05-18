-- =============================================================================
-- 002 — Sales transaction foundations (Fase A)
-- =============================================================================
-- Requiere: 001_tenancy_foundations.sql (tabla businesses)
-- Aplicar: npm run db:migrate:sales
-- NO incluye finalizeSale ni decremento de stock.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Sesiones de caja
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  terminal_id TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'open',
  opening_float NUMERIC(12, 2) NOT NULL DEFAULT 0,
  closing_amount NUMERIC(12, 2),
  opened_by_user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  closed_by_user_id UUID REFERENCES users (id) ON DELETE RESTRICT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cash_sessions_status_check
    CHECK (status IN ('open', 'closing', 'closed', 'suspended')),
  CONSTRAINT cash_sessions_opening_float_check
    CHECK (opening_float >= 0),
  CONSTRAINT cash_sessions_closing_amount_check
    CHECK (closing_amount IS NULL OR closing_amount >= 0)
);

CREATE INDEX IF NOT EXISTS cash_sessions_business_status_idx
  ON cash_sessions (business_id, status);

CREATE INDEX IF NOT EXISTS cash_sessions_business_terminal_idx
  ON cash_sessions (business_id, terminal_id, opened_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS cash_sessions_one_open_per_terminal_uidx
  ON cash_sessions (business_id, terminal_id)
  WHERE status = 'open';

-- ---------------------------------------------------------------------------
-- Ventas (cabecera)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  cash_session_id UUID NOT NULL REFERENCES cash_sessions (id) ON DELETE RESTRICT,
  terminal_id TEXT NOT NULL DEFAULT 'default',
  receipt_number BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_by_user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_status_check
    CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  CONSTRAINT sales_payment_method_check
    CHECK (
      payment_method IS NULL
      OR payment_method IN ('cash', 'card', 'mixed')
    ),
  CONSTRAINT sales_totals_non_negative_check
    CHECK (
      subtotal >= 0
      AND tax_total >= 0
      AND discount_total >= 0
      AND total >= 0
    ),
  CONSTRAINT sales_business_receipt_number_uidx
    UNIQUE (business_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS sales_business_created_at_idx
  ON sales (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sales_business_status_idx
  ON sales (business_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS sales_cash_session_idx
  ON sales (cash_session_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS sales_business_idempotency_key_uidx
  ON sales (business_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Líneas de venta (snapshot)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(6, 3) NOT NULL DEFAULT 0,
  line_total NUMERIC(12, 2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sale_items_quantity_check
    CHECK (quantity > 0),
  CONSTRAINT sale_items_unit_price_check
    CHECK (unit_price >= 0),
  CONSTRAINT sale_items_discount_percent_check
    CHECK (discount_percent >= 0 AND discount_percent <= 100),
  CONSTRAINT sale_items_line_total_check
    CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx
  ON sale_items (sale_id, sort_order);

CREATE INDEX IF NOT EXISTS sale_items_product_id_idx
  ON sale_items (product_id);

-- ---------------------------------------------------------------------------
-- Idempotencia (finalize y operaciones futuras)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sale_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL DEFAULT 'finalize_sale',
  sale_id UUID REFERENCES sales (id) ON DELETE SET NULL,
  response_payload JSONB,
  response_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT sale_idempotency_keys_operation_check
    CHECK (operation IN ('finalize_sale')),
  CONSTRAINT sale_idempotency_keys_business_key_uidx
    UNIQUE (business_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS sale_idempotency_keys_sale_id_idx
  ON sale_idempotency_keys (sale_id)
  WHERE sale_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sale_idempotency_keys_business_created_idx
  ON sale_idempotency_keys (business_id, created_at DESC);
