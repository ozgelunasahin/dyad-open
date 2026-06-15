-- Fix accept_invitation and decline_invitation: declare v_prompt_id as TEXT, not UUID.
-- prompts.id is a nanoid TEXT column; prompt_invitations.prompt_id is also TEXT.
-- The UUID declaration introduced in 20260502100400 caused
-- "invalid input syntax for type uuid" at runtime when selecting prompt_id into
-- the variable. Replace both functions with the corrected declaration.

CREATE OR REPLACE FUNCTION accept_invitation(p_invitation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_state TEXT;
  v_existing_invitee UUID;
  v_existing_meeting_id UUID;
  v_slot_id UUID;
  v_invitee_id UUID;
  v_inviter_id UUID;
  v_prompt_id TEXT;
  v_slot_accepted BOOLEAN;
  v_slot_start TIMESTAMPTZ;
  v_meeting_id UUID;
  v_caller UUID := app.current_user_id();
BEGIN
  -- Gate A: fast idempotent branch for sequential retries after success.
  -- Returns the existing meeting_id without inserting a duplicate notification.
  SELECT state, invitee_id INTO v_existing_state, v_existing_invitee
  FROM prompt_invitations
  WHERE id = p_invitation_id;

  IF v_existing_state = 'accepted' THEN
    IF v_existing_invitee != v_caller THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
    SELECT id INTO v_existing_meeting_id
    FROM meetings
    WHERE invitation_id = p_invitation_id;
    IF v_existing_meeting_id IS NULL THEN
      RAISE EXCEPTION 'Accepted invitation has no meeting';
    END IF;
    RETURN v_existing_meeting_id;
  END IF;

  -- Pending-path: try to lock the row in state='pending'.
  SELECT slot_id, invitee_id, inviter_id, prompt_id
    INTO v_slot_id, v_invitee_id, v_inviter_id, v_prompt_id
  FROM prompt_invitations
  WHERE id = p_invitation_id AND state = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Gate B: re-acquire and check if a concurrent accept landed.
    SELECT state, invitee_id INTO v_existing_state, v_existing_invitee
    FROM prompt_invitations
    WHERE id = p_invitation_id
    FOR UPDATE;

    IF v_existing_state = 'accepted' AND v_existing_invitee = v_caller THEN
      SELECT id INTO v_existing_meeting_id
      FROM meetings
      WHERE invitation_id = p_invitation_id;
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

  -- Lock slot and check availability + timing
  SELECT accepted, start_time INTO v_slot_accepted, v_slot_start
  FROM time_slots WHERE id = v_slot_id FOR UPDATE;

  IF v_slot_accepted THEN
    UPDATE prompt_invitations
    SET state = 'cancelled', resolved_at = NOW()
    WHERE id = p_invitation_id;
    RETURN NULL;
  END IF;

  IF v_slot_start <= NOW() THEN
    UPDATE prompt_invitations
    SET state = 'expired', resolved_at = NOW()
    WHERE id = p_invitation_id;
    RETURN NULL;
  END IF;

  -- Book slot + accept invitation
  UPDATE time_slots SET accepted = TRUE WHERE id = v_slot_id;
  UPDATE prompt_invitations
  SET state = 'accepted', resolved_at = NOW()
  WHERE id = p_invitation_id;

  -- Cancel competing invitations for this slot
  UPDATE prompt_invitations
  SET state = 'cancelled', resolved_at = NOW()
  WHERE slot_id = v_slot_id AND id != p_invitation_id AND state = 'pending';

  -- Create meeting
  INSERT INTO meetings (invitation_id, prompt_id, participant_a, participant_b,
                        slot_id, scheduled_time, duration_minutes)
  SELECT pi.id, pi.prompt_id, pi.invitee_id, pi.inviter_id,
         pi.slot_id, ts.start_time, ts.duration_minutes
  FROM prompt_invitations pi
  JOIN time_slots ts ON ts.id = pi.slot_id
  WHERE pi.id = p_invitation_id
  RETURNING id INTO v_meeting_id;

  -- Notify the inviter that their invitation was accepted.
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

CREATE OR REPLACE FUNCTION decline_invitation(p_invitation_id UUID, p_reason TEXT DEFAULT NULL::text)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := app.current_user_id();
  v_invitee_id UUID;
  v_inviter_id UUID;
  v_prompt_id TEXT;
  v_slot_id UUID;
  v_slot_start TIMESTAMPTZ;
  v_reason TEXT;
BEGIN
  IF p_reason IS NOT NULL THEN
    v_reason := NULLIF(BTRIM(p_reason), '');
    IF v_reason IS NOT NULL AND char_length(v_reason) > 2000 THEN
      RAISE EXCEPTION 'Reason must be at most 2000 characters';
    END IF;
  END IF;

  SELECT invitee_id, inviter_id, prompt_id, slot_id
    INTO v_invitee_id, v_inviter_id, v_prompt_id, v_slot_id
  FROM prompt_invitations
  WHERE id = p_invitation_id AND state = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or not pending';
  END IF;

  IF v_invitee_id != v_caller THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT start_time INTO v_slot_start FROM time_slots WHERE id = v_slot_id;

  UPDATE prompt_invitations
  SET state = 'declined', resolved_at = NOW(), decline_reason = v_reason
  WHERE id = p_invitation_id;

  INSERT INTO notifications (user_id, type, data)
  VALUES (v_inviter_id, 'meeting_response', jsonb_build_object(
    'kind', 'declined',
    'invitation_id', p_invitation_id,
    'prompt_id', v_prompt_id,
    'declined_by', v_invitee_id,
    'scheduled_time', v_slot_start,
    'reason', v_reason
  ));
END;
$$;

REVOKE EXECUTE ON FUNCTION decline_invitation FROM public;
GRANT EXECUTE ON FUNCTION decline_invitation TO authenticated;
