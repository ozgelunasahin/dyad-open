-- Make accept_invitation idempotent for the legitimate invitee, including
-- under concurrent retries.
--
-- Previously: a user hitting Accept twice (flaky network, double-tap) saw the
-- first call succeed and book the meeting; the second call raised "Invitation
-- not found or not pending" and the client returned an error. The meeting
-- existed, but the UI signalled failure.
--
-- Now, two gates:
--   A. Fast pre-check (no lock): if state is already 'accepted' at transaction
--      start AND the caller is the original invitee, return the meeting_id
--      immediately. Skips locking for the common retry-after-success case.
--   B. Post-lock race-safe branch: if the pending-state FOR UPDATE lookup
--      returns no rows, re-acquire the row WITHOUT the state filter and check:
--      if state moved to 'accepted' while we were waiting on the lock AND the
--      caller is the invitee, return the existing meeting_id. Handles the
--      truly-concurrent double-accept case that Gate A would miss.
--
-- Any other state / caller combination behaves as before.

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
  v_slot_accepted BOOLEAN;
  v_slot_start TIMESTAMPTZ;
  v_meeting_id UUID;
  v_caller UUID := (SELECT auth.uid());
BEGIN
  -- Gate A: fast idempotent branch for sequential retries after success.
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
      -- Schema invariant violation: accepted invitation with no meeting.
      -- Raise rather than return NULL (which the API would surface as
      -- "slot already booked" — misleading).
      RAISE EXCEPTION 'Accepted invitation has no meeting';
    END IF;
    RETURN v_existing_meeting_id;
  END IF;

  -- Pending-path: try to lock the row in state='pending'.
  SELECT slot_id, invitee_id INTO v_slot_id, v_invitee_id
  FROM prompt_invitations
  WHERE id = p_invitation_id AND state = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Gate B: the row exists but is no longer pending — likely a concurrent
    -- accept committed between Gate A and this lock. Re-acquire without the
    -- state filter and check if the idempotent branch applies now.
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

  RETURN v_meeting_id;
END;
$$;

-- GRANT unchanged — function already granted to authenticated in earlier migration.
