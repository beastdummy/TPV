-- =============================================================================
-- 001 — Tenancy foundations (mínimo)
-- =============================================================================
-- Tablas: businesses, business_members
-- Compat: trigger mantiene users.role desde membresía primaria activa
-- Backfill: npm run db:migrate:tenancy (DEFAULT_BUSINESS_* en .env)
-- =============================================================================

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  currency_code CHAR(3) NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT businesses_slug_check
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT businesses_status_check
    CHECK (status IN ('active', 'suspended', 'archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_uidx ON businesses (slug);
CREATE INDEX IF NOT EXISTS businesses_status_idx ON businesses (status);

CREATE TABLE IF NOT EXISTS business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'cashier',
  status TEXT NOT NULL DEFAULT 'active',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_members_role_check
    CHECK (role IN ('owner', 'admin', 'manager', 'cashier')),
  CONSTRAINT business_members_status_check
    CHECK (status IN ('active', 'invited', 'suspended', 'removed')),
  CONSTRAINT business_members_business_user_uidx
    UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS business_members_user_id_idx
  ON business_members (user_id);

CREATE INDEX IF NOT EXISTS business_members_business_id_idx
  ON business_members (business_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS business_members_one_owner_uidx
  ON business_members (business_id)
  WHERE role = 'owner' AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS business_members_one_primary_per_user_uidx
  ON business_members (user_id)
  WHERE is_primary = TRUE AND status = 'active';

CREATE OR REPLACE FUNCTION sync_users_role_from_primary_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_primary AND NEW.status = 'active' THEN
    UPDATE users
    SET role = NEW.role, updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_members_sync_users_role_trg ON business_members;

CREATE TRIGGER business_members_sync_users_role_trg
AFTER INSERT OR UPDATE OF role, status, is_primary
ON business_members
FOR EACH ROW
EXECUTE FUNCTION sync_users_role_from_primary_membership();
