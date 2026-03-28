-- SAFEGUARDING FIX: Hide accepted (confirmed meeting) time slots from non-participants.
-- Accepted slots reveal where someone will be at a specific time — a stalking vector.
--
-- Three visibility rules:
-- 1. Authors always see all their own slots
-- 2. Non-authors see only unaccepted slots of published prompts
-- 3. Meeting participants can see their accepted slot (they need to know where to go)

-- Fix authenticated policy
DROP POLICY IF EXISTS "Authenticated users can read slots of published prompts" ON time_slots;

CREATE POLICY "Authenticated users read slots with safeguarding"
  ON time_slots FOR SELECT TO authenticated
  USING (
    -- Authors always see their own slots
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
      AND prompts.author_id = (SELECT auth.uid())
    )
    OR (
      -- Non-authors see only unaccepted slots of published prompts
      accepted = FALSE
      AND EXISTS (
        SELECT 1 FROM prompts
        WHERE prompts.id = time_slots.prompt_id
        AND prompts.state = 'published'
      )
    )
    OR (
      -- Meeting participants can see their accepted slot
      accepted = TRUE
      AND EXISTS (
        SELECT 1 FROM meetings
        WHERE meetings.slot_id = time_slots.id
        AND (SELECT auth.uid()) IN (meetings.participant_a, meetings.participant_b)
      )
    )
  );

-- Fix anon policy — anon should never see accepted slots
DROP POLICY IF EXISTS "Anyone can read slots of published prompts" ON time_slots;

CREATE POLICY "Anon reads unaccepted slots of published prompts"
  ON time_slots FOR SELECT TO anon
  USING (
    accepted = FALSE
    AND EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
      AND prompts.state = 'published'
    )
  );

-- Performance index for the invitation count query in layout server
CREATE INDEX IF NOT EXISTS idx_prompt_invitations_invitee_state
  ON prompt_invitations(invitee_id, state);
