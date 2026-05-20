-- Allow more than one accepted invitation on the same time slot.
--
-- Each accept produces an independent dyadic meeting row sharing one slot.
-- `time_slots.accepted` means "this slot has at least one accepted meeting on it."

-- ============================================
-- accept_invitation
-- ============================================
-- Slots are no longer single-occupancy. Acceptance only fails if the slot has
-- passed, or if this inviter already has an active meeting on this slot.

CREATE OR REPLACE FUNCTION accept_invitation(p_invitation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id UUID;
  v_invitee_id UUID;
  v_inviter_id UUID;
  v_prompt_id TEXT;
  v_slot_start TIMESTAMPTZ;
  v_meeting_id UUID;
  v_caller UUID := app.current_user_id();
  v_existing_meeting_id UUID;
  v_existing_state TEXT;
  v_existing_invitee UUID;
BEGIN
  -- Gate A: idempotent return-existing-meeting branch for sequential retries
  -- after a successful accept (double-tap, flaky network). Returns the same
  -- meeting_id without re-inserting the meeting or notification rows.
  SELECT state, invitee_id INTO v_existing_state, v_existing_invitee
  FROM prompt_invitations
  WHERE id = p_invitation_id;

  IF v_existing_state = 'accepted' THEN
    IF v_existing_invitee != v_caller THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
    SELECT id INTO v_existing_meeting_id
    FROM meetings WHERE invitation_id = p_invitation_id;
    IF v_existing_meeting_id IS NULL THEN
      RAISE EXCEPTION 'Accepted invitation has no meeting';
    END IF;
    RETURN v_existing_meeting_id;
  END IF;

  SELECT slot_id, invitee_id, inviter_id, prompt_id
    INTO v_slot_id, v_invitee_id, v_inviter_id, v_prompt_id
  FROM prompt_invitations
  WHERE id = p_invitation_id AND state = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Gate B: race-safe re-check. A concurrent accept may have landed between
    -- Gate A's read and the FOR UPDATE here. Re-lock the row and resolve as
    -- idempotent if the caller is the same invitee.
    SELECT state, invitee_id INTO v_existing_state, v_existing_invitee
    FROM prompt_invitations
    WHERE id = p_invitation_id
    FOR UPDATE;

    IF v_existing_state = 'accepted' AND v_existing_invitee = v_caller THEN
      SELECT id INTO v_existing_meeting_id
      FROM meetings WHERE invitation_id = p_invitation_id;
      IF v_existing_meeting_id IS NULL THEN
        RAISE EXCEPTION 'Accepted invitation has no meeting';
      END IF;
      RETURN v_existing_meeting_id;
    END IF;

    RAISE EXCEPTION 'Invitation not found or not pending';
  END IF;

  IF v_invitee_id != v_caller THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT start_time INTO v_slot_start
  FROM time_slots WHERE id = v_slot_id FOR UPDATE;

  IF v_slot_start <= NOW() THEN
    UPDATE prompt_invitations
    SET state = 'expired', resolved_at = NOW()
    WHERE id = p_invitation_id;
    RETURN NULL;
  END IF;

  -- Reject when the inviter already has an active meeting on this slot.
  SELECT id INTO v_existing_meeting_id
  FROM meetings
  WHERE slot_id = v_slot_id
    AND participant_b = v_inviter_id
    AND state IN ('scheduled', 'awaiting_feedback', 'completed')
  LIMIT 1;

  IF v_existing_meeting_id IS NOT NULL THEN
    UPDATE prompt_invitations
    SET state = 'cancelled', resolved_at = NOW()
    WHERE id = p_invitation_id;
    RETURN NULL;
  END IF;

  UPDATE time_slots SET accepted = TRUE WHERE id = v_slot_id;
  UPDATE prompt_invitations
  SET state = 'accepted', resolved_at = NOW()
  WHERE id = p_invitation_id;

  INSERT INTO meetings (invitation_id, prompt_id, participant_a, participant_b,
                        slot_id, scheduled_time, duration_minutes)
  SELECT pi.id, pi.prompt_id, pi.invitee_id, pi.inviter_id,
         pi.slot_id, ts.start_time, ts.duration_minutes
  FROM prompt_invitations pi
  JOIN time_slots ts ON ts.id = pi.slot_id
  WHERE pi.id = p_invitation_id
  RETURNING id INTO v_meeting_id;

  INSERT INTO notifications (user_id, type, data)
  VALUES (v_inviter_id, 'meeting_response', jsonb_build_object(
    'kind', 'accepted',
    'invitation_id', p_invitation_id,
    'meeting_id', v_meeting_id,
    'prompt_id', v_prompt_id,
    'accepted_by', v_invitee_id,
    'scheduled_time', v_slot_start
  ));

  RETURN v_meeting_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION accept_invitation FROM public;
GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;

-- ============================================
-- cancel_meeting
-- ============================================
-- Early-tier cancellation only flips time_slots.accepted = FALSE when no other
-- active meetings remain on the slot. Otherwise the column would lie about the
-- slot state while a meeting still exists.

CREATE OR REPLACE FUNCTION cancel_meeting(p_meeting_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meeting meetings%ROWTYPE;
  v_tier TEXT;
  v_caller UUID := app.current_user_id();
  v_other UUID;
  v_free_pass BOOLEAN := FALSE;
  v_late_count INTEGER;
  v_remaining_active INTEGER;
BEGIN
  SELECT * INTO v_meeting FROM meetings
  WHERE id = p_meeting_id AND state = 'scheduled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting not found or not cancellable';
  END IF;

  IF v_caller NOT IN (v_meeting.participant_a, v_meeting.participant_b) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  IF v_caller = v_meeting.participant_a THEN
    v_other := v_meeting.participant_b;
  ELSE
    v_other := v_meeting.participant_a;
  END IF;

  IF v_meeting.scheduled_time - INTERVAL '12 hours' > NOW() THEN
    v_tier := 'early';
  ELSE
    v_tier := 'late';
  END IF;

  IF v_tier = 'early' AND (p_reason IS NULL OR char_length(p_reason) < 10) THEN
    RAISE EXCEPTION 'Early cancellation requires an explanation (min 10 characters)';
  END IF;

  IF v_tier = 'late' THEN
    SELECT COUNT(*) INTO v_late_count
    FROM cancellation_records cr
    WHERE cr.cancelled_by = v_caller
      AND cr.tier = 'late'
      AND cr.cancelled_at > NOW() - INTERVAL '90 days';

    IF v_late_count = 0 THEN
      v_free_pass := TRUE;
    END IF;
  END IF;

  UPDATE meetings
  SET state = CASE WHEN v_tier = 'early' THEN 'cancelled_early' ELSE 'cancelled_late' END,
      resolved_at = NOW()
  WHERE id = p_meeting_id;

  INSERT INTO cancellation_records (meeting_id, cancelled_by, tier, reason, free_pass_used)
  VALUES (p_meeting_id, v_caller, v_tier, p_reason, v_free_pass);

  -- Take the slot lock so concurrent cancellations serialize and the
  -- remaining-active count below is consistent under READ COMMITTED.
  PERFORM 1 FROM time_slots WHERE id = v_meeting.slot_id FOR UPDATE;

  SELECT COUNT(*) INTO v_remaining_active
  FROM meetings
  WHERE slot_id = v_meeting.slot_id
    AND id != p_meeting_id
    AND state IN ('scheduled', 'awaiting_feedback');

  IF v_remaining_active = 0 THEN
    UPDATE time_slots SET accepted = FALSE WHERE id = v_meeting.slot_id;
  END IF;

  INSERT INTO notifications (user_id, type, data)
  VALUES (v_other, 'meeting_cancelled', jsonb_build_object(
    'meeting_id', p_meeting_id,
    'cancelled_by', v_caller,
    'scheduled_time', v_meeting.scheduled_time,
    'reason', p_reason
  ));

  RETURN v_tier;
END;
$$;

REVOKE EXECUTE ON FUNCTION cancel_meeting FROM public;
GRANT EXECUTE ON FUNCTION cancel_meeting TO authenticated;

-- ============================================
-- time_slots SELECT policy
-- ============================================
-- Authors see all their own slots. Meeting participants see slots they are on.
-- Other authenticated callers see slots of published, non-hidden prompts whose
-- audience they belong to (commons or a granted scope). The 'accepted = FALSE'
-- filter is dropped so multi-invite slots remain visible to additional inviters.

DROP POLICY IF EXISTS "Authenticated users read slots with safeguarding" ON time_slots;
CREATE POLICY "Authenticated users read slots with safeguarding"
  ON time_slots FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
        AND prompts.author_id = app.current_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.slot_id = time_slots.id
        AND app.current_user_id() IN (meetings.participant_a, meetings.participant_b)
    )
    OR EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
        AND prompts.state = 'published'
        AND prompts.hidden_at IS NULL
        AND (
          prompts.audience_scope IS NULL
          OR EXISTS (
            SELECT 1 FROM identity_scopes
            WHERE identity_scopes.identity_id = app.current_user_id()
              AND identity_scopes.scope = prompts.audience_scope
              AND identity_scopes.revoked_at IS NULL
          )
        )
    )
  );

-- anon sees slots of published, non-hidden, public-audience prompts. The accept
-- state of a slot no longer affects visibility.

DROP POLICY IF EXISTS "Anon reads unaccepted slots of published prompts" ON time_slots;
CREATE POLICY "Anon reads slots of published prompts"
  ON time_slots FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
        AND prompts.state = 'published'
        AND prompts.hidden_at IS NULL
        AND prompts.audience_scope IS NULL
    )
  );
