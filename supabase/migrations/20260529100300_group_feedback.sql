-- Group feedback (R5 / U11).
--
-- A "group gathering" is a single time_slot with >= 2 active meetings: the
-- author paired independently with each joiner (a star of two-person meetings,
-- see 20260519100000_allow_multi_invite_per_slot.sql). The existing per-pair
-- feedback_forms model (20260401_create_feedback_forms.sql) would mint TWO
-- 'due' forms per meeting, so the author of an 8-person gathering would face N
-- separate app-blocking feedback gates for one evening.
--
-- This replaces that, FOR GROUP GATHERINGS ONLY, with ONE simple group-level
-- form per distinct participant, keyed to the slot. One row -> one gate per
-- gathering. One-on-one (a slot resolving to a single pair) is untouched: it
-- keeps the two-directional simultaneous-reveal + rating-tags model.
--
-- Scope of this slice: collect-and-gate. There is NO inter-participant reveal
-- of group feedback (an open question deferred to a founder call); the form is
-- group-level only (no per-person rating / reputation) — recorded debt.

-- ============================================
-- GROUP FEEDBACK TABLE
-- ============================================

CREATE TABLE group_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE RESTRICT,
  slot_id UUID NOT NULL REFERENCES time_slots(id),
  reviewer_id UUID NOT NULL REFERENCES identities(id),
  meet_again BOOLEAN,
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 2000),
  personal_feedback TEXT CHECK (personal_feedback IS NULL OR char_length(personal_feedback) <= 2000),
  state TEXT NOT NULL DEFAULT 'due'
    CHECK (state IN ('due', 'submitted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  -- One group feedback row per participant per gathering (slot).
  CONSTRAINT uq_one_group_feedback_per_reviewer UNIQUE (slot_id, reviewer_id)
);

-- Gate lookup: the hot path is "does this reviewer have a 'due' group form?".
CREATE INDEX idx_group_feedback_gate ON group_feedback(reviewer_id, state)
  WHERE state = 'due';
CREATE INDEX idx_group_feedback_slot ON group_feedback(slot_id);

-- ============================================
-- RLS
-- ============================================
-- Mirrors the feedback_forms pattern: the reviewer manages (reads + updates)
-- only their own row; no user INSERT/DELETE (rows are minted by the
-- SECURITY DEFINER advance_scheduled_meetings). The admin plane reads via the
-- service-role client, which bypasses RLS entirely — so no admin SELECT policy
-- is needed (same as feedback_forms). New policies use app.current_user_id().

ALTER TABLE group_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviewer reads own group feedback"
  ON group_feedback FOR SELECT
  USING (app.current_user_id() = reviewer_id);

CREATE POLICY "Reviewer updates own group feedback"
  ON group_feedback FOR UPDATE
  USING (app.current_user_id() = reviewer_id)
  WITH CHECK (app.current_user_id() = reviewer_id);

-- No INSERT or DELETE for users — rows created only by SECURITY DEFINER below.

-- ============================================
-- SUBMIT GROUP FEEDBACK
-- ============================================
-- meet_again is the one required answer ("would you have a conversation with
-- these people again?"). comment + personal_feedback are optional free text.
-- No simultaneous reveal in this slice — submitting just flips the row to
-- 'submitted' and clears the gate for this participant.

CREATE OR REPLACE FUNCTION submit_group_feedback(
  p_form_id UUID,
  p_meet_again BOOLEAN,
  p_comment TEXT DEFAULT NULL,
  p_personal_feedback TEXT DEFAULT NULL
)
RETURNS TEXT  -- returns new state: 'submitted'
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form group_feedback%ROWTYPE;
BEGIN
  -- Lock this form (only the owner's own due/submitted row is editable).
  SELECT * INTO v_form FROM group_feedback
  WHERE id = p_form_id AND state IN ('due', 'submitted')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form not found or not editable';
  END IF;

  IF v_form.reviewer_id != app.current_user_id() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- meet_again is required.
  IF p_meet_again IS NULL THEN
    RAISE EXCEPTION 'meet_again is required';
  END IF;

  UPDATE group_feedback SET
    meet_again = p_meet_again,
    comment = p_comment,
    personal_feedback = p_personal_feedback,
    state = 'submitted',
    submitted_at = COALESCE(submitted_at, NOW())
  WHERE id = p_form_id;

  RETURN 'submitted';
END;
$$;

REVOKE EXECUTE ON FUNCTION submit_group_feedback FROM public;
GRANT EXECUTE ON FUNCTION submit_group_feedback TO authenticated;

-- ============================================
-- REWRITE advance_scheduled_meetings — group-aware branch
-- ============================================
-- The current body (20260401_create_feedback_forms.sql) advances every
-- 'scheduled' meeting past its time to 'awaiting_feedback' and mints two
-- per-pair feedback_forms. We keep that EXACTLY for one-on-one slots and add a
-- group branch.
--
-- Approach: advance the meetings first (as before), collecting which slots had
-- meetings advance this run. Then, per affected slot, count the ACTIVE meetings
-- on the slot using the seat-occupancy predicate ('scheduled',
-- 'awaiting_feedback') — the same set accept_invitation's capacity cap and
-- get_prompt_slot_occupancy use. (Right after the advance, the gathering's
-- meetings are all 'awaiting_feedback'.)
--
--   * GROUP slot (>= 2 active meetings): mint ONE 'due' group_feedback row per
--     DISTINCT participant (the author = participant_a, plus every joiner =
--     participant_b), and DO NOT mint the per-pair feedback_forms for those
--     meetings. Transition those meetings straight to 'completed' so the 1:1
--     simultaneous-reveal state machine (submit_feedback, which expects an
--     'awaiting_feedback' meeting with two due forms) never sees them. Group
--     feedback is tracked independently via group_feedback, decoupled from
--     meeting state.
--   * ONE-ON-ONE slot (exactly 1 active meeting): unchanged — leave the meeting
--     in 'awaiting_feedback' and mint the two directional feedback_forms, just
--     like the original function did.

CREATE OR REPLACE FUNCTION advance_scheduled_meetings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  advanced_count INTEGER := 0;
  v_meeting RECORD;
  v_slot RECORD;
  v_active_count INTEGER;
  v_advanced_slots UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Phase 1: advance due meetings to awaiting_feedback (verbatim original
  -- behaviour), collecting the affected slot ids.
  FOR v_meeting IN
    UPDATE meetings
    SET state = 'awaiting_feedback', resolved_at = NOW()
    WHERE state = 'scheduled' AND scheduled_time <= NOW()
    RETURNING id, slot_id
  LOOP
    v_advanced_slots := array_append(v_advanced_slots, v_meeting.slot_id);
    advanced_count := advanced_count + 1;
  END LOOP;

  -- Phase 2: per DISTINCT affected slot, branch on the active-meeting count.
  FOR v_slot IN
    SELECT DISTINCT unnest(v_advanced_slots) AS slot_id
  LOOP
    SELECT COUNT(*) INTO v_active_count
    FROM meetings
    WHERE slot_id = v_slot.slot_id
      AND state IN ('scheduled', 'awaiting_feedback');

    IF v_active_count >= 2 THEN
      -- GROUP gathering: one group_feedback row per DISTINCT participant.
      -- participant_a is the author (the same identity across every pair on the
      -- slot); participant_b is each joiner. The LATERAL expansion emits the
      -- author once per pair (so N times for N joiners); ON CONFLICT (slot_id,
      -- reviewer_id) DO NOTHING collapses those repeats to the single author row
      -- and also keeps the whole INSERT idempotent across re-runs.
      INSERT INTO group_feedback (prompt_id, slot_id, reviewer_id, state)
      SELECT m.prompt_id, m.slot_id, participant, 'due'
      FROM meetings m
      CROSS JOIN LATERAL (
        VALUES (m.participant_a), (m.participant_b)
      ) AS p(participant)
      WHERE m.slot_id = v_slot.slot_id
        AND m.state = 'awaiting_feedback'
      ON CONFLICT (slot_id, reviewer_id) DO NOTHING;

      -- The gathering happened; feedback is tracked via group_feedback, so move
      -- these meetings straight to 'completed'. This keeps them out of the 1:1
      -- simultaneous-reveal machine (no per-pair feedback_forms are created).
      UPDATE meetings
      SET state = 'completed', resolved_at = NOW()
      WHERE slot_id = v_slot.slot_id
        AND state = 'awaiting_feedback';
    ELSE
      -- ONE-ON-ONE: original per-pair behaviour, unchanged. Mint two directional
      -- feedback_forms for the single awaiting_feedback meeting on this slot.
      FOR v_meeting IN
        SELECT id, participant_a, participant_b
        FROM meetings
        WHERE slot_id = v_slot.slot_id
          AND state = 'awaiting_feedback'
      LOOP
        INSERT INTO feedback_forms (meeting_id, reviewer_id, reviewee_id, state)
        VALUES
          (v_meeting.id, v_meeting.participant_a, v_meeting.participant_b, 'due'),
          (v_meeting.id, v_meeting.participant_b, v_meeting.participant_a, 'due');
      END LOOP;
    END IF;
  END LOOP;

  RETURN advanced_count;
END;
$$;

-- Preserve the original grant surface EXACTLY (service_role only, as set in
-- 20260330 and left untouched by 20260401's CREATE OR REPLACE). The hooks gate
-- call from the authenticated request client has always failed open under this
-- grant; the real advancement runs service-role. Changing this would alter
-- one-on-one behaviour, which must stay unchanged.
REVOKE EXECUTE ON FUNCTION advance_scheduled_meetings FROM public;
GRANT EXECUTE ON FUNCTION advance_scheduled_meetings TO service_role;

COMMENT ON TABLE group_feedback IS
  'One group-level feedback row per participant per group gathering (slot with >= 2 active meetings). Author + each joiner each get one row. Replaces the per-pair feedback_forms gate pile-up for groups; one-on-one keeps feedback_forms. Collect-and-gate only — no inter-participant reveal in this slice.';
