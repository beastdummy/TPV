-- =============================================================================
-- 009 — Category image URL (local optimized uploads)
-- =============================================================================

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';
