-- Phase D — D5: Replace auth.uid() with app.current_user_id() in all active
-- domain-table RLS policies and SECURITY DEFINER functions.
--
-- Wrapped in a transaction: a partial failure rolls back completely, leaving
-- no mix of old/new policies in effect.
--
-- After this migration the database layer is fully decoupled at the FK chain
-- and RLS application layer. app.current_user_id() (D4) is the single point
-- that maps JWT → identities.id for any future provider swap.

BEGIN;

-- ============================================================
-- RLS policies
-- ============================================================
-- Pattern: DROP IF EXISTS, then recreate with app.current_user_id().
-- Only policies that reference auth.uid() are touched.

-- adjective_vocabulary
DROP POLICY IF EXISTS "Anyone can read active vocabulary" ON adjective_vocabulary;
CREATE POLICY "Anyone can read active vocabulary"
  ON adjective_vocabulary FOR SELECT
  USING (active = true AND app.current_user_id() IS NOT NULL);

-- cancellation_records
DROP POLICY IF EXISTS "Participants read own cancellation records" ON cancellation_records;
CREATE POLICY "Participants read own cancellation records"
  ON cancellation_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = cancellation_records.meeting_id
        AND app.current_user_id() IN (meetings.participant_a, meetings.participant_b)
    )
  );

-- feedback_forms
DROP POLICY IF EXISTS "Reviewer reads own form" ON feedback_forms;
CREATE POLICY "Reviewer reads own form"
  ON feedback_forms FOR SELECT
  USING (app.current_user_id() = reviewer_id);

DROP POLICY IF EXISTS "Reviewee reads locked feedback" ON feedback_forms;
CREATE POLICY "Reviewee reads locked feedback"
  ON feedback_forms FOR SELECT
  USING (app.current_user_id() = reviewee_id AND state = 'locked');

DROP POLICY IF EXISTS "Reviewer updates own form" ON feedback_forms;
CREATE POLICY "Reviewer updates own form"
  ON feedback_forms FOR UPDATE
  USING (app.current_user_id() = reviewer_id)
  WITH CHECK (app.current_user_id() = reviewer_id);

-- meetings
DROP POLICY IF EXISTS "Participants read own meetings" ON meetings;
CREATE POLICY "Participants read own meetings"
  ON meetings FOR SELECT
  USING (app.current_user_id() IN (participant_a, participant_b));

-- notifications
DROP POLICY IF EXISTS "Insert own notifications" ON notifications;
CREATE POLICY "Insert own notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (app.current_user_id() = user_id);

DROP POLICY IF EXISTS "Update own notifications" ON notifications;
CREATE POLICY "Update own notifications"
  ON notifications FOR UPDATE
  USING (app.current_user_id() = user_id)
  WITH CHECK (app.current_user_id() = user_id);

DROP POLICY IF EXISTS "View own notifications" ON notifications;
CREATE POLICY "View own notifications"
  ON notifications FOR SELECT
  USING (app.current_user_id() = user_id);

-- profiles
DROP POLICY IF EXISTS "Authenticated users can read profile summaries" ON profiles;
CREATE POLICY "Authenticated users can read profile summaries"
  ON profiles FOR SELECT TO authenticated
  USING (app.current_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (app.current_user_id() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (app.current_user_id() = id);

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (app.current_user_id() = id);

-- prompt_comments
DROP POLICY IF EXISTS "Authors manage own comments" ON prompt_comments;
CREATE POLICY "Authors manage own comments"
  ON prompt_comments FOR ALL
  USING (app.current_user_id() = author_id)
  WITH CHECK (app.current_user_id() = author_id);

DROP POLICY IF EXISTS "Prompt author reads comments" ON prompt_comments;
CREATE POLICY "Prompt author reads comments"
  ON prompt_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = prompt_comments.prompt_id
        AND prompts.author_id = app.current_user_id()
    )
  );

-- prompt_invitations
DROP POLICY IF EXISTS "Invitee reads invitations" ON prompt_invitations;
CREATE POLICY "Invitee reads invitations"
  ON prompt_invitations FOR SELECT
  USING (app.current_user_id() = invitee_id);

DROP POLICY IF EXISTS "Inviter manages own invitations" ON prompt_invitations;
CREATE POLICY "Inviter manages own invitations"
  ON prompt_invitations FOR ALL
  USING (app.current_user_id() = inviter_id)
  WITH CHECK (app.current_user_id() = inviter_id);

-- prompts
DROP POLICY IF EXISTS "Authenticated users can read published prompts" ON prompts;
CREATE POLICY "Authenticated users can read published prompts"
  ON prompts FOR SELECT
  USING (state = 'published' AND app.current_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "Authors can manage own prompts" ON prompts;
CREATE POLICY "Authors can manage own prompts"
  ON prompts FOR ALL
  USING (app.current_user_id() = author_id);

-- reputation_signals
DROP POLICY IF EXISTS "Authenticated read visible signals" ON reputation_signals;
CREATE POLICY "Authenticated read visible signals"
  ON reputation_signals FOR SELECT
  USING (visible = true AND app.current_user_id() IS NOT NULL);

DROP POLICY IF EXISTS "Profile owner reads own signals" ON reputation_signals;
CREATE POLICY "Profile owner reads own signals"
  ON reputation_signals FOR SELECT
  USING (app.current_user_id() = profile_id);

DROP POLICY IF EXISTS "Profile owner toggles feedback visibility" ON reputation_signals;
CREATE POLICY "Profile owner toggles feedback visibility"
  ON reputation_signals FOR UPDATE
  USING (app.current_user_id() = profile_id AND signal_type = 'feedback_received');

-- time_slots
DROP POLICY IF EXISTS "Authors can manage own time slots" ON time_slots;
CREATE POLICY "Authors can manage own time slots"
  ON time_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
        AND prompts.author_id = app.current_user_id()
    )
  );

DROP POLICY IF EXISTS "Authenticated users read slots with safeguarding" ON time_slots;
CREATE POLICY "Authenticated users read slots with safeguarding"
  ON time_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
        AND prompts.author_id = app.current_user_id()
    )
    OR (
      accepted = false
      AND EXISTS (
        SELECT 1 FROM prompts
        WHERE prompts.id = time_slots.prompt_id
          AND prompts.state = 'published'
      )
    )
    OR (
      accepted = true
      AND EXISTS (
        SELECT 1 FROM meetings
        WHERE meetings.slot_id = time_slots.id
          AND app.current_user_id() IN (meetings.participant_a, meetings.participant_b)
      )
    )
  );

-- storage.objects
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'uploads'
    AND (app.current_user_id())::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- SECURITY DEFINER functions
-- ============================================================

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
  v_prompt_id UUID;
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
  v_prompt_id UUID;
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

CREATE OR REPLACE FUNCTION expire_slot_invitations(p_slot_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prompt_author UUID;
  expired_count INTEGER;
BEGIN
  SELECT p.author_id INTO v_prompt_author
  FROM time_slots ts
  JOIN prompts p ON p.id = ts.prompt_id
  WHERE ts.id = p_slot_id;

  IF NOT FOUND OR v_prompt_author != app.current_user_id() THEN
    RAISE EXCEPTION 'Not authorized to expire invitations for this slot';
  END IF;

  UPDATE prompt_invitations
  SET state = 'expired', resolved_at = NOW()
  WHERE slot_id = p_slot_id AND state = 'pending';

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

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
    SELECT COUNT(*) INTO v_late_count
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

  IF v_tier = 'early' THEN
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

CREATE OR REPLACE FUNCTION publish_prompt(p_prompt_id TEXT, p_slots JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id UUID;
  v_state TEXT;
  v_cover TEXT;
  v_slot JSONB;
BEGIN
  SELECT author_id, state, cover_image_url
  INTO v_author_id, v_state, v_cover
  FROM prompts
  WHERE id = p_prompt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prompt not found';
  END IF;

  IF v_author_id != app.current_user_id() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_state NOT IN ('draft', 'archived') THEN
    RAISE EXCEPTION 'Prompt is not in a publishable state (% -> published not allowed)', v_state;
  END IF;

  IF v_cover IS NULL THEN
    RAISE EXCEPTION 'Cover image is required to publish';
  END IF;

  IF jsonb_array_length(p_slots) = 0 THEN
    RAISE EXCEPTION 'At least one time slot is required';
  END IF;
  IF jsonb_array_length(p_slots) > 3 THEN
    RAISE EXCEPTION 'Cannot exceed 3 time slots per prompt';
  END IF;

  DELETE FROM time_slots
  WHERE prompt_id = p_prompt_id
    AND accepted = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM meetings WHERE meetings.slot_id = time_slots.id
    );

  FOR v_slot IN SELECT jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO time_slots (
      prompt_id, start_time, duration_minutes,
      exact_location, general_area, general_area_lat, general_area_lng
    )
    VALUES (
      p_prompt_id,
      (v_slot->>'start_time')::TIMESTAMPTZ,
      (v_slot->>'duration_minutes')::INTEGER,
      v_slot->'exact_location',
      v_slot->>'general_area',
      (v_slot->>'general_area_lat')::DOUBLE PRECISION,
      (v_slot->>'general_area_lng')::DOUBLE PRECISION
    );
  END LOOP;

  UPDATE prompts
  SET state = 'published', published_at = NOW(), archived_at = NULL
  WHERE id = p_prompt_id;
END;
$$;

CREATE OR REPLACE FUNCTION submit_feedback(
  p_form_id UUID,
  p_did_meet BOOLEAN,
  p_no_show_reason TEXT DEFAULT NULL::text,
  p_rating_tags TEXT[] DEFAULT '{}'::text[],
  p_free_text TEXT DEFAULT NULL::text,
  p_share_with_person TEXT DEFAULT NULL::text,
  p_share_with_platform TEXT DEFAULT NULL::text,
  p_platform_comments TEXT DEFAULT NULL::text
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form feedback_forms%ROWTYPE;
  v_other_form feedback_forms%ROWTYPE;
  v_new_state TEXT;
BEGIN
  SELECT * INTO v_form FROM feedback_forms
  WHERE id = p_form_id AND state IN ('due', 'submitted')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form not found or not editable';
  END IF;

  IF v_form.reviewer_id != app.current_user_id() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_did_meet IS NULL THEN
    RAISE EXCEPTION 'did_meet is required';
  END IF;

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

  SELECT * INTO v_other_form FROM feedback_forms
  WHERE meeting_id = v_form.meeting_id AND reviewer_id = v_form.reviewee_id
  FOR UPDATE;

  IF v_other_form.state = 'submitted' THEN
    UPDATE feedback_forms SET state = 'locked', locked_at = NOW()
    WHERE meeting_id = v_form.meeting_id AND state = 'submitted';

    UPDATE meetings SET state = 'completed', resolved_at = NOW()
    WHERE id = v_form.meeting_id AND state = 'awaiting_feedback';

    v_new_state := 'locked';
  ELSE
    v_new_state := 'submitted';
  END IF;

  RETURN v_new_state;
END;
$$;

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
    AND app.current_user_id() IN (m.participant_a, m.participant_b)
    AND m.state NOT IN ('cancelled_early', 'cancelled_late');
END;
$$;

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
    AND app.current_user_id() IN (m.participant_a, m.participant_b);
END;
$$;

COMMIT;
