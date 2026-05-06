-- Add an admin-controlled `hidden_at` column to `prompts` so operators can
-- suppress a conversation from public discovery surfaces (discover feed, map,
-- public profile listings, anonymous landing previews) without disturbing the
-- author's state machine or breaking direct URL access for invitees /
-- responders.
--
-- - NULL = visible (default)
-- - non-null timestamp = hidden, with the timestamp doubling as moderation
--   audit metadata
--
-- The column is orthogonal to `state`. Admin can hide any state.
--
-- See plan: prefig/docs/dyad/plans/2026-05-06-001-feat-admin-conversations-visibility-plan.md

ALTER TABLE prompts
  ADD COLUMN hidden_at TIMESTAMPTZ;

-- Replace the partial discover index so listing queries that filter on
-- `state = 'published' AND hidden_at IS NULL` can use it. Admin queries scan
-- the full table and don't rely on the index.
DROP INDEX IF EXISTS idx_prompts_discover;
CREATE INDEX idx_prompts_discover ON prompts(state, region)
  WHERE state = 'published' AND hidden_at IS NULL;

-- Update anon SELECT on prompts: hidden conversations are not public.
DROP POLICY IF EXISTS "Anyone can read published prompts" ON prompts;
CREATE POLICY "Anyone can read published prompts"
  ON prompts FOR SELECT TO anon
  USING (state = 'published' AND hidden_at IS NULL);

-- Authenticated SELECT on prompts is intentionally NOT amended. The same policy
-- governs both the discover feed and direct-URL conversation detail fetches.
-- Filtering hidden prompts at this layer would break direct URL access for
-- invitees, responders, and meeting participants — the plan's explicit
-- commitment is that hide affects listing surfaces only, not direct access.
-- Listing queries in src/lib/services/prompt-query.ts apply the hidden_at
-- filter at the application layer instead. Anon traffic remains
-- discovery-shaped, so the anon policy above keeps the RLS-layer filter.

-- Update anon SELECT on time_slots so hidden prompts' slots are not visible
-- on the public map. Preserves the existing accepted=FALSE safeguarding from
-- 20260409_fix_time_slots_rls_safeguarding.sql.
DROP POLICY IF EXISTS "Anon reads unaccepted slots of published prompts" ON time_slots;
CREATE POLICY "Anon reads unaccepted slots of published prompts"
  ON time_slots FOR SELECT TO anon
  USING (
    accepted = FALSE
    AND EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
        AND prompts.state = 'published'
        AND prompts.hidden_at IS NULL
    )
  );

-- Update authenticated SELECT on time_slots. Authors keep full visibility of
-- their own slots even when hidden; meeting participants keep their accepted
-- slot regardless. Only the discover-shaped clause (non-author + unaccepted)
-- gains the hidden_at filter.
DROP POLICY IF EXISTS "Authenticated users read slots with safeguarding" ON time_slots;
CREATE POLICY "Authenticated users read slots with safeguarding"
  ON time_slots FOR SELECT TO authenticated
  USING (
    -- Authors always see their own slots; hide does not affect author view.
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
        AND prompts.author_id = app.current_user_id()
    )
    OR (
      -- Non-authors see unaccepted slots of published, non-hidden prompts.
      accepted = false
      AND EXISTS (
        SELECT 1 FROM prompts
        WHERE prompts.id = time_slots.prompt_id
          AND prompts.state = 'published'
          AND prompts.hidden_at IS NULL
      )
    )
    OR (
      -- Meeting participants see their accepted slot regardless of hidden.
      -- Hiding a conversation does NOT disrupt scheduled meetings.
      accepted = true
      AND EXISTS (
        SELECT 1 FROM meetings
        WHERE meetings.slot_id = time_slots.id
          AND app.current_user_id() IN (meetings.participant_a, meetings.participant_b)
      )
    )
  );
