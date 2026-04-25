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
