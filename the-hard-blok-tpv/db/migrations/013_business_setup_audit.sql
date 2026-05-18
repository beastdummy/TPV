-- =============================================================================
-- 013 — Business setup completion + audit log foundation
-- =============================================================================

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS business_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  actor_member_id UUID REFERENCES business_members (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_audit_logs_business_created_idx
  ON business_audit_logs (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS business_audit_logs_action_idx
  ON business_audit_logs (business_id, action);
