-- =============================================================================
-- 017 — Dedupe business_roles by (business_id, slug), keep oldest row
-- =============================================================================
-- Idempotent: safe to run multiple times.
-- business_members.role stores slug text; no remap needed when duplicate rows share slug.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_roles_business_slug_uidx'
      AND conrelid = 'public.business_roles'::regclass
  ) THEN
    ALTER TABLE business_roles
      ADD CONSTRAINT business_roles_business_slug_uidx
      UNIQUE (business_id, slug);
  END IF;
END $$;

WITH ranked AS (
  SELECT
    id,
    business_id,
    slug,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, slug
      ORDER BY created_at ASC, id ASC
    ) AS row_num
  FROM business_roles
),
keepers AS (
  SELECT id AS keeper_id, business_id, slug
  FROM ranked
  WHERE row_num = 1
),
dupes AS (
  SELECT r.id AS duplicate_id, k.keeper_id
  FROM ranked r
  INNER JOIN keepers k
    ON k.business_id = r.business_id
    AND k.slug = r.slug
  WHERE r.row_num > 1
)
INSERT INTO business_role_permissions (
  business_id,
  business_role_id,
  permission,
  permission_key
)
SELECT
  brp.business_id,
  d.keeper_id,
  brp.permission,
  COALESCE(brp.permission_key, brp.permission)
FROM business_role_permissions brp
INNER JOIN dupes d ON d.duplicate_id = brp.business_role_id
ON CONFLICT (business_id, business_role_id, permission_key) DO NOTHING;

WITH ranked AS (
  SELECT
    id,
    business_id,
    slug,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, slug
      ORDER BY created_at ASC, id ASC
    ) AS row_num
  FROM business_roles
)
DELETE FROM business_roles br
USING ranked r
WHERE br.id = r.id
  AND r.row_num > 1;
