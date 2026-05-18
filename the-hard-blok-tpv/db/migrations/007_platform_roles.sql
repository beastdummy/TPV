-- =============================================================================
-- 007 — Platform roles (The Hard Blok internal operators)
-- =============================================================================
-- Roles: owner, dev, admin, support, moderator, billing, viewer
-- Separate from business_members.role (tenant/custom roles).
-- =============================================================================

ALTER TABLE platform_admins DROP CONSTRAINT IF EXISTS platform_admins_role_check;

UPDATE platform_admins
SET role = 'owner'
WHERE role = 'platform_owner';

UPDATE platform_admins
SET role = 'admin'
WHERE role = 'platform_admin';

UPDATE platform_admins
SET role = 'support'
WHERE role = 'platform_support';

ALTER TABLE platform_admins
  ALTER COLUMN role SET DEFAULT 'viewer';

ALTER TABLE platform_admins
  ADD CONSTRAINT platform_admins_role_check
  CHECK (
    role IN (
      'owner',
      'dev',
      'admin',
      'support',
      'moderator',
      'billing',
      'viewer'
    )
  );
