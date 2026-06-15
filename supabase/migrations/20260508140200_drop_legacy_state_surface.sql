-- State machine collapse — drop legacy schema surface.
--
-- Final migration of the three-part state-machine collapse. After this:
--   - prompts.archived_at column is gone
--   - prompts.edited_at column is gone
--   - archive_stale_prompts() function is gone
--   - prompts.state CHECK constraint allows only 'draft' and 'published'
--
-- All callers of archive_stale_prompts have been removed (the function was
-- never cronned). edited_at had its write path removed in PR #19; this drops
-- the now-dead column. archived_at had its write path removed in
-- 20260508140000's publish_prompt RPC update.

ALTER TABLE prompts DROP COLUMN IF EXISTS archived_at;

ALTER TABLE prompts DROP COLUMN IF EXISTS edited_at;

DROP FUNCTION IF EXISTS archive_stale_prompts();

-- Tighten the state CHECK to remove the 'archived' value. Safe because
-- 20260508140100 migrated all archived rows to 'draft', and the foundation
-- migration's publish_prompt RPC no longer accepts 'archived' as a
-- publishable state.
ALTER TABLE prompts DROP CONSTRAINT IF EXISTS prompts_state_check;
ALTER TABLE prompts ADD CONSTRAINT prompts_state_check
  CHECK (state IN ('draft', 'published'));
