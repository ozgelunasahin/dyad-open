-- A time slot can be RETIRED: taken off the market without deleting history.
--
-- Since multi-invite (20260519100000) dropped the accepted=FALSE visibility
-- gate, a slot whose meetings were all cancelled would silently re-open for
-- fresh invitations. When the author calls off a whole gathering
-- (cancel_gathering, next migration) that contradicts their act — the time is
-- no longer on offer. retired_at marks the slot as withdrawn while its
-- cancelled meetings, invitations, and cancellation records stay readable for
-- attribution.
--
-- Enforcement is two-layered: app-side filters (available-slot derivations,
-- invitation creation) plus the hard guard added to accept_invitation below —
-- a pending invitation on a retired slot resolves to cancelled instead of
-- minting a meeting. The accept_invitation body is copied verbatim from the
-- authoritative 20260529100100 version; ONLY the retired guard is inserted
-- (after the expired-slot branch, before the inviter-duplicate guard).

ALTER TABLE time_slots ADD COLUMN retired_at TIMESTAMPTZ;

COMMENT ON COLUMN time_slots.retired_at IS
  'Set when the author withdraws this time (whole-gathering cancel). Retired slots are not offered, not invitable, and accept_invitation rejects them.';

-- Column-level grants: the base table uses an explicit column list (see
-- 20260329 / 20260402) that excludes exact_location. retired_at must be
-- granted or the security_invoker view below raises permission denied for
-- every caller.
GRANT SELECT (retired_at) ON time_slots TO authenticated;
GRANT SELECT (retired_at) ON time_slots TO anon;

-- Recreate the public view with the new column. CRITICAL: the authoritative
-- definition (20260402) carries WITH (security_invoker = true) so the view
-- evaluates RLS as the calling role — recreating without it would silently
-- run the view as its owner and bypass RLS on time_slots. Mirror the 20260402
-- idiom exactly: drop, recreate with the option, re-grant.
DROP VIEW IF EXISTS time_slots_public;
CREATE VIEW time_slots_public
  WITH (security_invoker = true)
  AS SELECT id, prompt_id, start_time, duration_minutes,
            general_area, general_area_lat, general_area_lng,
            accepted, created_at, retired_at
     FROM time_slots;

GRANT SELECT ON time_slots_public TO authenticated;
GRANT SELECT ON time_slots_public TO anon;

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
  v_slot_retired_at TIMESTAMPTZ;
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

  SELECT start_time, retired_at INTO v_slot_start, v_slot_retired_at
  FROM time_slots WHERE id = v_slot_id FOR UPDATE;

  IF v_slot_start <= NOW() THEN
    UPDATE prompt_invitations
    SET state = 'expired', resolved_at = NOW()
    WHERE id = p_invitation_id;
    RETURN NULL;
  END IF;

  -- Retired slot: the author withdrew this time (whole-gathering cancel).
  -- Resolve the invitation like the full/duplicate cases — no meeting minted.
  IF v_slot_retired_at IS NOT NULL THEN
    UPDATE prompt_invitations
    SET state = 'cancelled', resolved_at = NOW()
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
