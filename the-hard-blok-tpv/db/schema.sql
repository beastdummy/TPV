-- =============================================================================
-- The Hard Blok TPV — esquema completo (aplicación)
-- =============================================================================
-- Aplicar (con .env en la raíz del proyecto):
--   npm run db:schema
-- O:
--   psql "$DATABASE_URL" -f db/schema.sql
--
-- Incluye: extensión pgcrypto, users + google_sub, sessions (app legacy),
--          catálogo (categories, products) e índices.
-- La autenticación de Better Auth (tablas user/session/account/verification)
-- se crea aparte: npm run db:auth-migrate
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Usuarios de la aplicación (roles, enlace Google)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'manager', 'cashier'))
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_sub TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_uidx
ON users (google_sub)
WHERE google_sub IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- ---------------------------------------------------------------------------
-- Sesiones legacy de la app (no confundir con la tabla "session" de Better Auth)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

-- ---------------------------------------------------------------------------
-- Catálogo (TPV)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS categories_sort_idx ON categories (sort_order);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(12, 2) NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  image_url TEXT NOT NULL DEFAULT '',
  tax_rate NUMERIC(6, 3) NOT NULL DEFAULT 0,
  warehouse TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_category_id_idx ON products (category_id);
CREATE INDEX IF NOT EXISTS products_sort_idx ON products (sort_order);

-- ---------------------------------------------------------------------------
-- Inventario (almacenes y stock por producto)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibilidad con el campo legacy products.warehouse (texto libre):
-- crea almacenes si existen valores en productos que aún no están en warehouses.
INSERT INTO warehouses (id, name, is_active)
SELECT
  TRIM(BOTH '-' FROM REGEXP_REPLACE(
    LOWER(
      TRANSLATE(
        p.warehouse,
        'ÁÀÄÂáàäâÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔóòöôÚÙÜÛúùüûÑñÇç',
        'AAAAaaaaEEEEeeeeIIIIiiiiOOOOooooUUUUuuuuNnCc'
      )
    ),
    '[^a-z0-9]+',
    '-',
    'g'
  )) AS id,
  p.warehouse AS name,
  TRUE AS is_active
FROM products p
WHERE TRIM(COALESCE(p.warehouse, '')) <> ''
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS product_stock (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
  minimum_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
  reorder_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS product_stock_warehouse_idx
ON product_stock (warehouse_id);

CREATE INDEX IF NOT EXISTS product_stock_product_idx
ON product_stock (product_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL,
  previous_quantity NUMERIC(14, 3) NOT NULL,
  new_quantity NUMERIC(14, 3) NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  reason_code TEXT,
  note TEXT,
  correlation_id UUID,
  performed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_movements_type_check
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
    )),
  CONSTRAINT stock_movements_qty_check
    CHECK (quantity >= 0)
);

-- pos_terminal_settings: ver db/migrations/016_inventory_hospitality.sql
-- (requiere businesses, creada en db:migrate:tenancy)

CREATE INDEX IF NOT EXISTS stock_movements_warehouse_idx
ON stock_movements (warehouse_id, created_at DESC);

CREATE INDEX IF NOT EXISTS stock_movements_product_idx
ON stock_movements (product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  lot_code TEXT NOT NULL DEFAULT '',
  serial_number TEXT NOT NULL DEFAULT '',
  expiry_date DATE,
  qty_on_hand NUMERIC(14, 3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_items_qty_on_hand_check CHECK (qty_on_hand >= 0)
);

CREATE INDEX IF NOT EXISTS inventory_items_lookup_idx
ON inventory_items (product_id, warehouse_id, lot_code, serial_number);

CREATE INDEX IF NOT EXISTS inventory_items_expiry_idx
ON inventory_items (expiry_date);

CREATE TABLE IF NOT EXISTS inventory_item_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  performed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_item_movements_type_check
    CHECK (movement_type IN ('in', 'out', 'adjustment')),
  CONSTRAINT inventory_item_movements_qty_check
    CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS inventory_item_movements_item_idx
ON inventory_item_movements (inventory_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS inventory_item_movements_wh_idx
ON inventory_item_movements (warehouse_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Compras a proveedor
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tax_id TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS suppliers_name_idx
ON suppliers (name);

CREATE TABLE IF NOT EXISTS purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  notes TEXT NOT NULL DEFAULT '',
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS purchase_receipts_supplier_idx
ON purchase_receipts (supplier_id, created_at DESC);

CREATE INDEX IF NOT EXISTS purchase_receipts_warehouse_idx
ON purchase_receipts (warehouse_id, created_at DESC);

CREATE TABLE IF NOT EXISTS purchase_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 3) NOT NULL,
  unit_cost NUMERIC(12, 3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT purchase_receipt_items_qty_check CHECK (quantity > 0),
  CONSTRAINT purchase_receipt_items_unit_cost_check CHECK (unit_cost >= 0)
);

CREATE INDEX IF NOT EXISTS purchase_receipt_items_receipt_idx
ON purchase_receipt_items (receipt_id);
