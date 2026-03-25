-- Extend accept_invitation to create a Meeting record and return its UUID.
-- Also adds a 12h guard: reject acceptance if slot starts within 12 hours.
-- Changes return type from BOOLEAN to UUID (meeting ID or NULL).

-- Must drop first because return type changes from BOOLEAN to UUID
DROP FUNCTION IF EXISTS accept_invitation(UUID);

CREATE FUNCTION accept_invitation(p_invitation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id UUID;
  v_invitee_id UUID;
  v_slot_accepted BOOLEAN;
  v_slot_start TIMESTAMPTZ;
  v_meeting_id UUID;
BEGIN
  -- Lock invitation
  SELECT slot_id, invitee_id INTO v_slot_id, v_invitee_id
  FROM prompt_invitations
  WHERE id = p_invitation_id AND state = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or not pending';
  END IF;

  IF v_invitee_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Lock slot and check availability
  SELECT accepted, start_time INTO v_slot_accepted, v_slot_start
  FROM time_slots WHERE id = v_slot_id FOR UPDATE;

  IF v_slot_accepted THEN
    UPDATE prompt_invitations
    SET state = 'cancelled', resolved_at = NOW()
    WHERE id = p_invitation_id;
    RETURN NULL;
  END IF;

  -- Guard: reject if slot starts within 12 hours (invitation should have expired)
  IF v_slot_start - INTERVAL '12 hours' <= NOW() THEN
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
  SELECT pi.invitee_id, pi.prompt_id, pi.invitee_id, pi.inviter_id,
         pi.slot_id, ts.start_time, ts.duration_minutes
  FROM prompt_invitations pi
  JOIN time_slots ts ON ts.id = pi.slot_id
  WHERE pi.id = p_invitation_id
  RETURNING id INTO v_meeting_id;

  RETURN v_meeting_id;
END;
$$;

-- Re-apply execution restrictions (lost on DROP)
REVOKE EXECUTE ON FUNCTION accept_invitation FROM public;
GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;
