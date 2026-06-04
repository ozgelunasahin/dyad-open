-- Enforce per-conversation capacity in accept_invitation.
--
-- A time slot hosts at most `prompts.capacity` accepted meetings (joiners).
-- capacity = 1 restores single-occupancy (one-on-one); 2-7 allows a small
-- group; NULL is legacy-unlimited.
--
-- This copies the multi-invite accept_invitation body verbatim
-- (20260519100000) and inserts ONLY the capacity check, placed after the
-- inviter-duplicate guard and before `UPDATE time_slots SET accepted = TRUE`.
-- The slot row is already locked FOR UPDATE above, so concurrent accepts on
-- the same slot serialize through this point and the seat count is consistent.
-- Gate A / Gate B idempotency, the expired-slot branch, and the REVOKE/GRANT
-- are preserved unchanged.

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
  v_capacity INTEGER;
  v_active_on_slot INTEGER;
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

  -- Capacity cap: a slot hosts at most `capacity` accepted meetings (joiners).
  -- NULL = legacy unlimited. Seat-occupancy uses (scheduled, awaiting_feedback)
  -- — deliberately NOT the inviter-duplicate guard's set above (which includes
  -- 'completed'); a 'completed' meeting cannot exist on a still-future slot,
  -- where accepts happen. Same shape as the inviter-duplicate rejection so the
  -- caller cannot distinguish "already joined" from "full" by side effect.
  SELECT capacity INTO v_capacity FROM prompts WHERE id = v_prompt_id;

  IF v_capacity IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active_on_slot
    FROM meetings
    WHERE slot_id = v_slot_id
      AND state IN ('scheduled', 'awaiting_feedback');

    IF v_active_on_slot >= v_capacity THEN
      UPDATE prompt_invitations
      SET state = 'cancelled', resolved_at = NOW()
      WHERE id = p_invitation_id;
      RETURN NULL;
    END IF;
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
