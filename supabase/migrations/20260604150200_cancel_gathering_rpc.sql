-- cancel_gathering: the author cancels joiners — some, or all — in one act.
--
-- A gathering = N pair-meetings (author = participant_a on every row) sharing
-- one time_slot. Cancelling them one by one would require N reasons, run N
-- late free-pass checks, and leave no way to call the time itself off.
-- This RPC performs one act, in one transaction, over a SELECTION:
--
--   * p_pair_meeting_ids = NULL  → the ENTIRETY: every scheduled pair is
--     cancelled, pending invitations on the slot are resolved, and the slot
--     is RETIRED (see 20260604150100) — the time is withdrawn;
--   * p_pair_meeting_ids = [...] → those pairs only ("uninvite these
--     people"): the named pairs are cancelled and notified; the time STAYS
--     OPEN for the remaining and future joiners (no retirement, pending
--     invitations untouched). Every id must be a scheduled pair on the
--     anchor's slot with the caller as participant_a — anything else aborts
--     the whole act;
--   * host-only (caller must be the prompt author) — SECURITY DEFINER
--     bypasses RLS, so the check is explicit, mirroring
--     get_prompt_slot_occupancy's author branch;
--   * tier (early/late, 12h rule) judged ONCE — every pair shares the slot's
--     scheduled_time, so the tier is uniform by construction;
--   * early requires one reason (>=10 chars), recorded on every cancelled
--     pair's cancellation_records row;
--   * ONE free-pass act: rows share a group_key (see 20260604150000) and the
--     distinct-act count treats them as a single late cancellation.
--     free_pass_used is written UNIFORMLY on every row of the act — it means
--     "this row belongs to an act that consumed a free pass", so any row of
--     the act answers the question. Admin aggregations must count acts
--     (DISTINCT COALESCE(group_key, id)), not rows;
--   * SCOPE: state = 'scheduled' pairs only, intentionally. awaiting_feedback
--     /completed pairs already happened (advance only fires after the slot
--     time) — they cannot be "called off". The only window where a scheduled
--     anchor coexists with advanced siblings is the moments around the slot
--     time itself, where a call-off is moot;
--   * every affected joiner gets a meeting_cancelled notification;
--   * like cancel_meeting, accepted flips FALSE when a selection leaves zero
--     active meetings on the slot (the slot state must not lie).
--
-- LOCK ORDER: slot FOR UPDATE first, then meeting rows — the same global
-- order as cancel_meeting (20260604150000) and accept_invitation, so a
-- joiner's pair-cancel racing the author's call-off serializes instead of
-- deadlocking. The anchor is plain-read for prechecks before the slot lock;
-- the cancellable set is collected under the slot lock, so a concurrently
-- cancelled anchor doesn't abort the act (the author's intent — end the
-- gathering — still applies to the remaining pairs).
--
-- Returns one row per cancelled pair (tier, joiner_id, meeting_id) so the
-- API layer can fan out emails per recipient, each linking the joiner's OWN
-- pair-meeting page (meetings RLS hides other pairs' pages from them).
--
-- Post-deploy verification:
--   -- act-vs-row accounting sanity (expect 0 rows pre-existing groups):
--   SELECT cancelled_by FROM cancellation_records
--   WHERE tier='late' AND cancelled_at > NOW() - INTERVAL '90 days'
--   GROUP BY cancelled_by
--   HAVING COUNT(*) != COUNT(DISTINCT COALESCE(group_key, id));
--   -- no retired slots immediately after migration:
--   SELECT COUNT(*) FROM time_slots WHERE retired_at IS NOT NULL;
--   -- no pending invitations on retired slots (after first use):
--   SELECT pi.id FROM prompt_invitations pi
--   JOIN time_slots ts ON ts.id = pi.slot_id
--   WHERE pi.state = 'pending' AND ts.retired_at IS NOT NULL;

CREATE OR REPLACE FUNCTION cancel_gathering(
  p_meeting_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_pair_meeting_ids UUID[] DEFAULT NULL
)
RETURNS TABLE(tier TEXT, joiner_id UUID, meeting_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := app.current_user_id();
  v_anchor meetings%ROWTYPE;
  v_author UUID;
  v_slot_start TIMESTAMPTZ;
  v_tier TEXT;
  v_free_pass BOOLEAN := FALSE;
  v_late_count INTEGER;
  v_group_key UUID := gen_random_uuid();
  v_pair RECORD;
  v_cancelled INTEGER := 0;
  v_entirety BOOLEAN := (p_pair_meeting_ids IS NULL);
  v_remaining_active INTEGER;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT v_entirety AND COALESCE(array_length(p_pair_meeting_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Nothing selected to cancel';
  END IF;

  -- Plain-read prechecks (no lock yet): anchor resolves the slot + prompt.
  -- The anchor itself may be cancelled concurrently — the act proceeds on
  -- whatever scheduled pairs remain under the slot lock below.
  SELECT * INTO v_anchor FROM meetings m WHERE m.id = p_meeting_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting not found or not cancellable';
  END IF;

  -- Host-only: the caller must author the prompt behind this gathering.
  SELECT author_id INTO v_author FROM prompts p WHERE p.id = v_anchor.prompt_id;
  IF v_author IS NULL OR v_author != v_caller THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Slot lock FIRST (global order: slot → meetings). Serializes against
  -- concurrent accepts, pair cancels, and other call-offs on this slot.
  SELECT start_time INTO v_slot_start
  FROM time_slots ts WHERE ts.id = v_anchor.slot_id FOR UPDATE;

  IF v_slot_start - INTERVAL '12 hours' > NOW() THEN
    v_tier := 'early';
  ELSE
    v_tier := 'late';
  END IF;

  IF v_tier = 'early' AND (p_reason IS NULL OR char_length(p_reason) < 10) THEN
    RAISE EXCEPTION 'Early cancellation requires an explanation (min 10 characters)';
  END IF;

  IF v_tier = 'late' THEN
    -- Distinct ACTS (shared definition with cancel_meeting, 20260604150000).
    SELECT COUNT(DISTINCT COALESCE(cr.group_key, cr.id)) INTO v_late_count
    FROM cancellation_records cr
    WHERE cr.cancelled_by = v_caller
      AND cr.tier = 'late'
      AND cr.cancelled_at > NOW() - INTERVAL '90 days';

    IF v_late_count = 0 THEN
      v_free_pass := TRUE;
    END IF;
  END IF;

  -- Selection validation BEFORE mutating anything: every requested id must be
  -- a pair on THIS slot with the caller as participant_a. A foreign or
  -- off-slot id aborts the whole act — partial application of an explicit
  -- selection would misrepresent the author's intent. Deliberately NO state
  -- requirement here: a selected pair that was concurrently cancelled (or
  -- advanced) is simply skipped by the scheduled-only loop below — the
  -- author's intent for that person is already satisfied, and aborting would
  -- strand the dialog in an unrecoverable retry loop against a stale roster.
  IF NOT v_entirety THEN
    IF EXISTS (
      SELECT 1 FROM unnest(p_pair_meeting_ids) AS req(id)
      WHERE NOT EXISTS (
        SELECT 1 FROM meetings m
        WHERE m.id = req.id
          AND m.slot_id = v_anchor.slot_id
          AND m.participant_a = v_caller
      )
    ) THEN
      RAISE EXCEPTION 'Meeting not found or not cancellable';
    END IF;
  END IF;

  -- Cancel the selected pairs (entirety: every live pair on the slot).
  -- participant_a = v_caller is belt and braces — the author is participant_a
  -- on every pair of their own slot.
  FOR v_pair IN
    SELECT m.id, m.participant_b FROM meetings m
    WHERE m.slot_id = v_anchor.slot_id
      AND m.state = 'scheduled'
      AND m.participant_a = v_caller
      AND (v_entirety OR m.id = ANY(p_pair_meeting_ids))
    FOR UPDATE
  LOOP
    UPDATE meetings m
    SET state = CASE WHEN v_tier = 'early' THEN 'cancelled_early' ELSE 'cancelled_late' END,
        resolved_at = NOW()
    WHERE m.id = v_pair.id;

    INSERT INTO cancellation_records (meeting_id, cancelled_by, tier, reason, free_pass_used, group_key)
    VALUES (v_pair.id, v_caller, v_tier, p_reason, v_free_pass, v_group_key);

    INSERT INTO notifications (user_id, type, data)
    VALUES (v_pair.participant_b, 'meeting_cancelled', jsonb_build_object(
      'meeting_id', v_pair.id,
      'cancelled_by', v_caller,
      'scheduled_time', v_slot_start,
      'reason', p_reason
    ));

    v_cancelled := v_cancelled + 1;
  END LOOP;

  IF v_cancelled = 0 THEN
    RAISE EXCEPTION 'Meeting not found or not cancellable';
  END IF;

  IF v_entirety THEN
    -- Pending invitations on a withdrawn time must not linger as actionable.
    UPDATE prompt_invitations pi
    SET state = 'cancelled', resolved_at = NOW()
    WHERE pi.slot_id = v_anchor.slot_id AND pi.state = 'pending';

    -- Withdraw the time itself.
    UPDATE time_slots ts
    SET retired_at = NOW(), accepted = FALSE
    WHERE ts.id = v_anchor.slot_id;
  ELSE
    -- Selection: the time stays open. But mirror cancel_meeting's invariant —
    -- accepted must not claim a meeting exists when none remains.
    SELECT COUNT(*) INTO v_remaining_active
    FROM meetings m
    WHERE m.slot_id = v_anchor.slot_id
      AND m.state IN ('scheduled', 'awaiting_feedback');

    IF v_remaining_active = 0 THEN
      UPDATE time_slots ts SET accepted = FALSE WHERE ts.id = v_anchor.slot_id;
    END IF;
  END IF;

  -- cr.meeting_id is table-qualified (SQL scope); the OUT column 'meeting_id'
  -- only shadows UNqualified plpgsql refs — keep every ref qualified here.
  RETURN QUERY
  SELECT v_tier, m.participant_b, m.id
  FROM cancellation_records cr
  JOIN meetings m ON m.id = cr.meeting_id
  WHERE cr.group_key = v_group_key;
END;
$$;

COMMENT ON FUNCTION cancel_gathering(UUID, TEXT, UUID[]) IS
  'Host-only gathering cancellation over a selection: p_pair_meeting_ids NULL cancels every scheduled pair, resolves pending invitations, and retires the slot (the time is withdrawn); a non-null selection cancels just those pairs and leaves the time open. One act either way: one tier, one reason, one free-pass via group_key. Returns (tier, joiner_id, meeting_id) per cancelled pair so the app layer can email each joiner a link to their own pair-meeting.';

REVOKE EXECUTE ON FUNCTION cancel_gathering FROM public;
GRANT EXECUTE ON FUNCTION cancel_gathering TO authenticated;
