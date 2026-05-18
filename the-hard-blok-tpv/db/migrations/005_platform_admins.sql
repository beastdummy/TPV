-- =============================================================================
-- 005 — Platform admins (SaaS operator roles, separate from business_members)
-- =============================================================================
-- Requiere: users (db/schema.sql)
-- Aplicar: npm run db:migrate:platform
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'platform_support',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_admins_role_check
    CHECK (role IN ('platform_owner', 'platform_admin', 'platform_support')),
  CONSTRAINT platform_admins_user_uidx UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS platform_admins_active_role_idx
  ON platform_admins (role)
  WHERE is_active = TRUE;
