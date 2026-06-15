-- One-shot data migration: collapse archived state into draft.
--
-- Existing rows with state='archived' become state='draft'. published_at is
-- preserved (so the UI's "Unpublished" label triggers correctly:
-- state='draft' AND published_at IS NOT NULL). archived_at column is left
-- in place; it gets dropped in 20260508140200 once no code reads it.
--
-- Safe because the production database has no real user-authored archived
-- conversations yet — only dogfooding rows. After this migration runs,
-- no row should have state='archived' and the CHECK constraint can be
-- tightened (next migration).

UPDATE prompts SET state = 'draft' WHERE state = 'archived';
