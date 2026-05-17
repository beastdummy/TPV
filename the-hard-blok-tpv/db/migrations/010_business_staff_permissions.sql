-- =============================================================================
-- 010 — Business staff: permissions matrix + employee PIN
-- =============================================================================

ALTER TABLE business_members
  ADD COLUMN IF NOT EXISTS pos_pin_hash TEXT;

ALTER TABLE business_role_permissions
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses (id) ON DELETE CASCADE;

ALTER TABLE business_role_permissions
  ADD COLUMN IF NOT EXISTS permission_key TEXT;

UPDATE business_role_permissions brp
SET
  business_id = br.business_id,
  permission_key = brp.permission
FROM business_roles br
WHERE br.id = brp.business_role_id
  AND (brp.business_id IS NULL OR brp.permission_key IS NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_role_permissions_business_role_key_uidx'
  ) THEN
    ALTER TABLE business_role_permissions
      ADD CONSTRAINT business_role_permissions_business_role_key_uidx
      UNIQUE (business_id, business_role_id, permission_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS business_role_permissions_business_id_idx
  ON business_role_permissions (business_id);
