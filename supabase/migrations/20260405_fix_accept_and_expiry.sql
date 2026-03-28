-- Fix accept_invitation: remove the 12-hour guard that rejects valid acceptances.
-- Policy change: users CAN accept invitations up to the slot start time.
-- The 12-hour rule applies to CANCELLATION only, not acceptance.
--
-- Fix expire_stale_invitations: expire at slot start time, not 12 hours before.

-- 1. Replace accept_invitation — remove the 12h guard (lines 46-52 in original)
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
  SELECT accepted INTO v_slot_accepted
  FROM time_slots WHERE id = v_slot_id FOR UPDATE;

  IF v_slot_accepted THEN
    UPDATE prompt_invitations
    SET state = 'cancelled', resolved_at = NOW()
    WHERE id = p_invitation_id;
    RETURN NULL;
  END IF;

  -- No 12-hour guard — acceptance is allowed up to slot start time.
  -- The 12h rule is cancellation-only (enforced in cancel_meeting).

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

  RETURN v_meeting_id;
END;
$$;

-- Re-apply execution restrictions
REVOKE EXECUTE ON FUNCTION accept_invitation FROM public;
GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;

-- 2. Fix expire_stale_invitations — expire at slot start time, not 12 hours before
CREATE OR REPLACE FUNCTION expire_stale_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE prompt_invitations
  SET state = 'expired', resolved_at = NOW()
  WHERE state = 'pending'
    AND slot_id IN (
      SELECT id FROM time_slots
      WHERE start_time <= NOW()  -- was: start_time - INTERVAL '12 hours' <= NOW()
    );

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;
