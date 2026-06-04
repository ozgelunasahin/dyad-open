-- One gathering cancel counts as ONE late act.
--
-- A whole-gathering cancellation (cancel_gathering, added in a following
-- migration) writes one cancellation_records row per pair-meeting. Without
-- grouping, the actor's 90-day late count would inflate N-fold for a single
-- social act, and the free-pass logic would burn the pass on the first row
-- while marking the rest unpassed.
--
-- `group_key` ties the N rows of one act together (NULL for ordinary pair
-- cancels — each row is its own act). The free-pass count in cancel_meeting
-- becomes COUNT(DISTINCT COALESCE(group_key, id)) so the two RPCs share one
-- accounting definition.
--
-- Lock-order change (vs 20260519100000): the slot lock is taken BEFORE the
-- meeting row lock. cancel_gathering (next migrations) locks slot → sibling
-- meetings; if cancel_meeting kept its old meeting → slot order, a joiner's
-- pair-cancel racing the author's gathering-cancel on the same slot would be
-- a classic AB-BA deadlock. Both RPCs now lock slot first, then meetings.
-- The meeting row is plain-read first (slot_id + participant precheck), then
-- re-locked and state-rechecked after the slot lock, so a cancel that lost
-- the race resolves as 'not cancellable' instead of deadlocking.
--
-- DELTAS from the authoritative 20260519100000 body — everything else is
-- copied verbatim:
--   1. free-pass count: COUNT(*) → COUNT(DISTINCT COALESCE(group_key, id))
--   2. lock order: slot FOR UPDATE before the meeting-row FOR UPDATE
--      (plain-read precheck added before the slot lock)

ALTER TABLE cancellation_records ADD COLUMN group_key UUID;

COMMENT ON COLUMN cancellation_records.group_key IS
  'Groups the rows of one whole-gathering cancellation act. NULL = standalone pair cancel. The 90-day late free-pass count counts distinct acts: COUNT(DISTINCT COALESCE(group_key, id)).';

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
  -- Plain read first: existence/participant precheck + slot id for the lock.
  SELECT * INTO v_meeting FROM meetings
  WHERE id = p_meeting_id AND state = 'scheduled';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting not found or not cancellable';
  END IF;

  IF v_caller NOT IN (v_meeting.participant_a, v_meeting.participant_b) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  -- Slot lock FIRST (global lock order: slot → meetings), then re-lock the
  -- meeting and re-check state — a concurrent cancel may have resolved it
  -- between the plain read and the slot lock.
  PERFORM 1 FROM time_slots WHERE id = v_meeting.slot_id FOR UPDATE;

  SELECT * INTO v_meeting FROM meetings
  WHERE id = p_meeting_id AND state = 'scheduled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting not found or not cancellable';
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
    -- Count distinct ACTS, not rows: a whole-gathering cancel groups its rows
    -- under one group_key and must consume exactly one act.
    SELECT COUNT(DISTINCT COALESCE(cr.group_key, cr.id)) INTO v_late_count
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
