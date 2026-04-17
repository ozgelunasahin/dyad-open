-- Add cancellation reason to the meeting_cancelled notification payload so the
-- other participant sees the explanation on their profile attention card
-- without needing to click through to the conversation page.
--
-- Body is identical to 20260410_cancel_meeting_notification.sql except the
-- final jsonb_build_object gains a 'reason' field.

CREATE OR REPLACE FUNCTION cancel_meeting(p_meeting_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meeting meetings%ROWTYPE;
  v_tier TEXT;
  v_caller UUID := (SELECT auth.uid());
  v_other UUID;
  v_free_pass BOOLEAN := FALSE;
  v_late_count INTEGER;
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

  -- Determine the other participant
  IF v_caller = v_meeting.participant_a THEN
    v_other := v_meeting.participant_b;
  ELSE
    v_other := v_meeting.participant_a;
  END IF;

  -- Compute tier from time until meeting
  IF v_meeting.scheduled_time - INTERVAL '12 hours' > NOW() THEN
    v_tier := 'early';
  ELSE
    v_tier := 'late';
  END IF;

  -- Early requires explanation
  IF v_tier = 'early' AND (p_reason IS NULL OR char_length(p_reason) < 10) THEN
    RAISE EXCEPTION 'Early cancellation requires an explanation (min 10 characters)';
  END IF;

  -- Free pass check for late cancellations (rolling 90-day window)
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

  -- Update meeting state
  UPDATE meetings
  SET state = CASE WHEN v_tier = 'early' THEN 'cancelled_early' ELSE 'cancelled_late' END,
      resolved_at = NOW()
  WHERE id = p_meeting_id;

  -- Record the cancellation
  INSERT INTO cancellation_records (meeting_id, cancelled_by, tier, reason, free_pass_used)
  VALUES (p_meeting_id, v_caller, v_tier, p_reason, v_free_pass);

  -- Early cancellation: release slot back to available
  IF v_tier = 'early' THEN
    UPDATE time_slots SET accepted = FALSE WHERE id = v_meeting.slot_id;
  END IF;

  -- Notify the other participant (now including the cancellation reason)
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
