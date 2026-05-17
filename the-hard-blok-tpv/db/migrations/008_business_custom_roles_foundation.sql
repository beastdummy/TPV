-- =============================================================================
-- 008 — Custom business roles foundation (no UI yet)
-- =============================================================================
-- Idempotent: safe to run multiple times.
-- business_members.role stays TEXT; "owner" remains fixed/special.
-- =============================================================================

ALTER TABLE business_members DROP CONSTRAINT IF EXISTS business_members_role_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_members_role_nonempty_check'
      AND conrelid = 'public.business_members'::regclass
  ) THEN
    ALTER TABLE business_members
      ADD CONSTRAINT business_members_role_nonempty_check
      CHECK (char_length(trim(role)) > 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS business_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_roles_slug_check
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT business_roles_business_slug_uidx UNIQUE (business_id, slug)
);

CREATE INDEX IF NOT EXISTS business_roles_business_id_idx
  ON business_roles (business_id);

CREATE TABLE IF NOT EXISTS business_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_role_id UUID NOT NULL REFERENCES business_roles (id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_role_permissions_permission_check
    CHECK (char_length(trim(permission)) > 0),
  CONSTRAINT business_role_permissions_role_permission_uidx
    UNIQUE (business_role_id, permission)
);

CREATE INDEX IF NOT EXISTS business_role_permissions_role_id_idx
  ON business_role_permissions (business_role_id);
