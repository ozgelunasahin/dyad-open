-- Meetings and cancellation records (Step 5)
-- Created atomically when an invitation is accepted.
-- Cancellation with symmetric tiers (early ≥12h / late <12h).

-- ============================================
-- MEETINGS TABLE
-- ============================================

CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL UNIQUE REFERENCES prompt_invitations(id),
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE RESTRICT,
  participant_a UUID NOT NULL REFERENCES auth.users(id),  -- prompt author (invitee)
  participant_b UUID NOT NULL REFERENCES auth.users(id),  -- inviter
  slot_id UUID NOT NULL REFERENCES time_slots(id),
  scheduled_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (state IN ('scheduled', 'cancelled_early', 'cancelled_late', 'awaiting_feedback', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT no_self_meeting CHECK (participant_a != participant_b)
);

CREATE INDEX idx_meetings_participants ON meetings(participant_a, participant_b);
CREATE INDEX idx_meetings_scheduled ON meetings(state, scheduled_time)
  WHERE state = 'scheduled';

-- RLS: participants can read their own meetings only. All mutations through RPC.
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read own meetings"
  ON meetings FOR SELECT
  USING (
    (SELECT auth.uid()) IN (participant_a, participant_b)
  );

-- ============================================
-- CANCELLATION RECORDS
-- ============================================

CREATE TABLE cancellation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL UNIQUE REFERENCES meetings(id),
  cancelled_by UUID NOT NULL REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tier TEXT NOT NULL CHECK (tier IN ('early', 'late')),
  reason TEXT CHECK (reason IS NULL OR char_length(reason) BETWEEN 10 AND 2000),
  free_pass_used BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT reason_required_for_early CHECK (tier != 'early' OR reason IS NOT NULL)
);

ALTER TABLE cancellation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read own cancellation records"
  ON cancellation_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = cancellation_records.meeting_id
      AND (SELECT auth.uid()) IN (meetings.participant_a, meetings.participant_b)
    )
  );

-- ============================================
-- CANCEL MEETING (symmetric tier logic)
-- ============================================

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

  -- Free pass check for late cancellations
  IF v_tier = 'late' THEN
    SELECT COUNT(*) INTO v_late_count
    FROM cancellation_records cr
    WHERE cr.cancelled_by = v_caller AND cr.tier = 'late';
    IF v_late_count = 0 THEN
      v_free_pass := TRUE;
    END IF;
  END IF;

  -- Transition meeting state
  UPDATE meetings
  SET state = CASE WHEN v_tier = 'early' THEN 'cancelled_early' ELSE 'cancelled_late' END,
      resolved_at = NOW()
  WHERE id = p_meeting_id;

  -- Record cancellation
  INSERT INTO cancellation_records (meeting_id, cancelled_by, tier, reason, free_pass_used)
  VALUES (p_meeting_id, v_caller, v_tier, p_reason, v_free_pass);

  -- Early cancellation: release slot back to available
  IF v_tier = 'early' THEN
    UPDATE time_slots SET accepted = FALSE WHERE id = v_meeting.slot_id;
  END IF;

  RETURN v_tier;
END;
$$;

REVOKE EXECUTE ON FUNCTION cancel_meeting FROM public;
GRANT EXECUTE ON FUNCTION cancel_meeting TO authenticated;

-- ============================================
-- ADVANCE SCHEDULED MEETINGS (time-based transition)
-- ============================================

CREATE OR REPLACE FUNCTION advance_scheduled_meetings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  advanced_count INTEGER;
BEGIN
  UPDATE meetings
  SET state = 'awaiting_feedback', resolved_at = NOW()
  WHERE state = 'scheduled' AND scheduled_time <= NOW();

  GET DIAGNOSTICS advanced_count = ROW_COUNT;
  RETURN advanced_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION advance_scheduled_meetings FROM public;
GRANT EXECUTE ON FUNCTION advance_scheduled_meetings TO service_role;

-- ============================================
-- GET MEETING WITH LOCATION (for active meetings — reveals exact_location)
-- ============================================

CREATE OR REPLACE FUNCTION get_meeting_with_location(p_meeting_id UUID)
RETURNS TABLE (
  id UUID, invitation_id UUID, prompt_id TEXT,
  participant_a UUID, participant_b UUID,
  scheduled_time TIMESTAMPTZ, duration_minutes INTEGER,
  state TEXT, created_at TIMESTAMPTZ,
  exact_location JSONB, general_area TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.invitation_id, m.prompt_id,
         m.participant_a, m.participant_b,
         m.scheduled_time, m.duration_minutes,
         m.state, m.created_at,
         ts.exact_location, ts.general_area
  FROM meetings m
  JOIN time_slots ts ON ts.id = m.slot_id
  WHERE m.id = p_meeting_id
    AND (SELECT auth.uid()) IN (m.participant_a, m.participant_b)
    AND m.state NOT IN ('cancelled_early', 'cancelled_late');
END;
$$;

REVOKE EXECUTE ON FUNCTION get_meeting_with_location FROM public;
GRANT EXECUTE ON FUNCTION get_meeting_with_location TO authenticated;

-- ============================================
-- GET MEETING DETAIL (for all meetings including cancelled — no exact_location)
-- ============================================

CREATE OR REPLACE FUNCTION get_meeting_detail(p_meeting_id UUID)
RETURNS TABLE (
  id UUID, invitation_id UUID, prompt_id TEXT,
  participant_a UUID, participant_b UUID,
  scheduled_time TIMESTAMPTZ, duration_minutes INTEGER,
  state TEXT, created_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ,
  general_area TEXT,
  cancellation_tier TEXT, cancellation_reason TEXT, cancelled_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.invitation_id, m.prompt_id,
         m.participant_a, m.participant_b,
         m.scheduled_time, m.duration_minutes,
         m.state, m.created_at, m.resolved_at,
         ts.general_area,
         cr.tier, cr.reason, cr.cancelled_by
  FROM meetings m
  JOIN time_slots ts ON ts.id = m.slot_id
  LEFT JOIN cancellation_records cr ON cr.meeting_id = m.id
  WHERE m.id = p_meeting_id
    AND (SELECT auth.uid()) IN (m.participant_a, m.participant_b);
END;
$$;

REVOKE EXECUTE ON FUNCTION get_meeting_detail FROM public;
GRANT EXECUTE ON FUNCTION get_meeting_detail TO authenticated;
