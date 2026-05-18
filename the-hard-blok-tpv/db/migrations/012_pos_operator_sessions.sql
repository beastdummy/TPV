-- =============================================================================
-- 012 — Sesiones de operador TPV por terminal (PIN)
-- =============================================================================
-- Requiere: 001_tenancy_foundations.sql
-- Aplicar: npm run db:migrate:tenancy
-- =============================================================================

CREATE TABLE IF NOT EXISTS pos_operator_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  terminal_id TEXT NOT NULL DEFAULT 'default',
  operator_member_id UUID NOT NULL REFERENCES business_members (id) ON DELETE CASCADE,
  operator_user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  operator_name TEXT NOT NULL DEFAULT '',
  operator_role TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pos_operator_sessions_status_check
    CHECK (status IN ('active', 'locked', 'expired'))
);

CREATE INDEX IF NOT EXISTS pos_operator_sessions_business_terminal_idx
  ON pos_operator_sessions (business_id, terminal_id, started_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS pos_operator_sessions_one_active_per_terminal_uidx
  ON pos_operator_sessions (business_id, terminal_id)
  WHERE status = 'active';
