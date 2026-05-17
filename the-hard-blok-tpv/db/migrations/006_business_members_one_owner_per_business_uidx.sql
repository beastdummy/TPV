-- =============================================================================
-- 006 — One active owner per business (not globally)
-- =============================================================================
-- Replaces legacy business_members_one_owner_uidx that blocked a second owner
-- across different businesses. SaaS requires one active owner per business_id.
-- =============================================================================

DROP INDEX IF EXISTS business_members_one_owner_uidx;

CREATE UNIQUE INDEX business_members_one_owner_uidx
  ON business_members (business_id)
  WHERE role = 'owner' AND status = 'active';
