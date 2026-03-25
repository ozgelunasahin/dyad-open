-- Feedback forms, reputation signals, and adjective vocabulary (Step 6)
-- Feedback forms are created when meetings advance to awaiting_feedback.
-- Gate: state='due' blocks the entire app for the reviewer until they submit.
-- Simultaneous reveal: both forms lock when both parties submit.

-- ============================================
-- ADJECTIVE VOCABULARY (reference data)
-- ============================================

CREATE TABLE adjective_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE adjective_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active vocabulary"
  ON adjective_vocabulary FOR SELECT
  USING (active = TRUE AND (SELECT auth.uid()) IS NOT NULL);

-- Seed initial vocabulary
INSERT INTO adjective_vocabulary (word) VALUES
  ('thoughtful'), ('curious'), ('warm'), ('articulate'),
  ('engaging'), ('open-minded'), ('kind'), ('insightful'),
  ('attentive'), ('genuine'), ('respectful'), ('creative');

-- ============================================
-- FEEDBACK FORMS
-- ============================================

CREATE TABLE feedback_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE RESTRICT,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  reviewee_id UUID NOT NULL REFERENCES auth.users(id),
  did_meet BOOLEAN,
  no_show_reason TEXT CHECK (no_show_reason IS NULL OR char_length(no_show_reason) BETWEEN 10 AND 1000),
  rating_tags TEXT[] DEFAULT '{}',
  free_text TEXT CHECK (free_text IS NULL OR char_length(free_text) <= 2000),
  share_with_person TEXT CHECK (share_with_person IS NULL OR char_length(share_with_person) <= 2000),
  share_with_platform TEXT CHECK (share_with_platform IS NULL OR char_length(share_with_platform) <= 2000),
  platform_comments TEXT CHECK (platform_comments IS NULL OR char_length(platform_comments) <= 2000),
  state TEXT NOT NULL DEFAULT 'not_due'
    CHECK (state IN ('not_due', 'due', 'submitted', 'locked', 'released')),
  submitted_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_one_feedback_per_reviewer UNIQUE (meeting_id, reviewer_id)
);

CREATE INDEX idx_feedback_forms_gate ON feedback_forms(reviewer_id, state)
  WHERE state = 'due';
CREATE INDEX idx_feedback_forms_meeting ON feedback_forms(meeting_id);

-- RLS: reviewer can SELECT + UPDATE only (no INSERT/DELETE — forms created by SECURITY DEFINER)
ALTER TABLE feedback_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviewer reads own form"
  ON feedback_forms FOR SELECT
  USING ((SELECT auth.uid()) = reviewer_id);

CREATE POLICY "Reviewer updates own form"
  ON feedback_forms FOR UPDATE
  USING ((SELECT auth.uid()) = reviewer_id)
  WITH CHECK ((SELECT auth.uid()) = reviewer_id);

CREATE POLICY "Reviewee reads locked feedback"
  ON feedback_forms FOR SELECT
  USING (
    (SELECT auth.uid()) = reviewee_id
    AND state = 'locked'
  );

-- Column-level REVOKE: hide platform fields from all authenticated users
-- SECURITY DEFINER functions (admin/moderation) can still read them
REVOKE SELECT ON feedback_forms FROM authenticated;
GRANT SELECT (id, meeting_id, reviewer_id, reviewee_id, did_meet, no_show_reason,
              rating_tags, free_text, share_with_person, state, submitted_at,
              locked_at, created_at)
  ON feedback_forms TO authenticated;
-- Grant UPDATE on all columns (reviewer needs to write platform fields via RPC, but direct UPDATE
-- is scoped by RLS to reviewer's own form only)
GRANT UPDATE ON feedback_forms TO authenticated;

-- ============================================
-- REPUTATION SIGNALS
-- ============================================

CREATE TABLE reputation_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES auth.users(id),
  signal_type TEXT NOT NULL CHECK (signal_type IN ('feedback_received', 'cancellation', 'no_show')),
  source_meeting_id UUID NOT NULL REFERENCES meetings(id),
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reputation_signals_profile ON reputation_signals(profile_id);

ALTER TABLE reputation_signals ENABLE ROW LEVEL SECURITY;

-- Profile owner can read their signals
CREATE POLICY "Profile owner reads own signals"
  ON reputation_signals FOR SELECT
  USING ((SELECT auth.uid()) = profile_id);

-- Profile owner can toggle visibility ONLY on feedback_received signals
CREATE POLICY "Profile owner toggles feedback visibility"
  ON reputation_signals FOR UPDATE
  USING (
    (SELECT auth.uid()) = profile_id
    AND signal_type = 'feedback_received'
  );

-- Anyone authenticated can read visible signals (for profile display)
CREATE POLICY "Authenticated read visible signals"
  ON reputation_signals FOR SELECT
  USING (visible = TRUE AND (SELECT auth.uid()) IS NOT NULL);

-- No INSERT or DELETE for users — signals created only by SECURITY DEFINER functions

-- ============================================
-- SUBMIT FEEDBACK (with simultaneous lock)
-- ============================================

CREATE OR REPLACE FUNCTION submit_feedback(
  p_form_id UUID,
  p_did_meet BOOLEAN,
  p_no_show_reason TEXT DEFAULT NULL,
  p_rating_tags TEXT[] DEFAULT '{}',
  p_free_text TEXT DEFAULT NULL,
  p_share_with_person TEXT DEFAULT NULL,
  p_share_with_platform TEXT DEFAULT NULL,
  p_platform_comments TEXT DEFAULT NULL
)
RETURNS TEXT  -- returns new state: 'submitted' or 'locked'
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form feedback_forms%ROWTYPE;
  v_other_form feedback_forms%ROWTYPE;
  v_new_state TEXT;
BEGIN
  -- Lock this form
  SELECT * INTO v_form FROM feedback_forms
  WHERE id = p_form_id AND state IN ('due', 'submitted')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form not found or not editable';
  END IF;

  IF v_form.reviewer_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Validate minimum: did_meet is required
  IF p_did_meet IS NULL THEN
    RAISE EXCEPTION 'did_meet is required';
  END IF;

  -- Validate rating_tags against vocabulary
  IF array_length(p_rating_tags, 1) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM unnest(p_rating_tags) AS tag
      WHERE tag NOT IN (SELECT word FROM adjective_vocabulary WHERE active = TRUE)
    ) THEN
      RAISE EXCEPTION 'Invalid rating tag(s)';
    END IF;
    IF array_length(p_rating_tags, 1) > 5 THEN
      RAISE EXCEPTION 'Maximum 5 rating tags allowed';
    END IF;
  END IF;

  -- Update form content
  UPDATE feedback_forms SET
    did_meet = p_did_meet,
    no_show_reason = p_no_show_reason,
    rating_tags = p_rating_tags,
    free_text = p_free_text,
    share_with_person = p_share_with_person,
    share_with_platform = p_share_with_platform,
    platform_comments = p_platform_comments,
    state = 'submitted',
    submitted_at = COALESCE(submitted_at, NOW())
  WHERE id = p_form_id;

  -- Check if the other party's form is also submitted
  SELECT * INTO v_other_form FROM feedback_forms
  WHERE meeting_id = v_form.meeting_id AND reviewer_id = v_form.reviewee_id
  FOR UPDATE;

  IF v_other_form.state = 'submitted' THEN
    -- Both submitted! Lock both forms simultaneously
    UPDATE feedback_forms SET state = 'locked', locked_at = NOW()
    WHERE meeting_id = v_form.meeting_id AND state = 'submitted';

    -- Transition meeting to completed
    UPDATE meetings SET state = 'completed', resolved_at = NOW()
    WHERE id = v_form.meeting_id AND state = 'awaiting_feedback';

    v_new_state := 'locked';
  ELSE
    v_new_state := 'submitted';
  END IF;

  RETURN v_new_state;
END;
$$;

REVOKE EXECUTE ON FUNCTION submit_feedback FROM public;
GRANT EXECUTE ON FUNCTION submit_feedback TO authenticated;

-- ============================================
-- EXTEND advance_scheduled_meetings TO CREATE FEEDBACK FORMS
-- ============================================

CREATE OR REPLACE FUNCTION advance_scheduled_meetings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  advanced_count INTEGER := 0;
  v_meeting RECORD;
BEGIN
  FOR v_meeting IN
    UPDATE meetings
    SET state = 'awaiting_feedback', resolved_at = NOW()
    WHERE state = 'scheduled' AND scheduled_time <= NOW()
    RETURNING id, participant_a, participant_b
  LOOP
    -- Create feedback forms for both participants
    INSERT INTO feedback_forms (meeting_id, reviewer_id, reviewee_id, state)
    VALUES
      (v_meeting.id, v_meeting.participant_a, v_meeting.participant_b, 'due'),
      (v_meeting.id, v_meeting.participant_b, v_meeting.participant_a, 'due');
    advanced_count := advanced_count + 1;
  END LOOP;

  RETURN advanced_count;
END;
$$;
