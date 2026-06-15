-- Feedback-gate RPC with counterpart-expiry exclusion — conference-scoped
-- access (U7).
--
-- The one-on-one feedback gate uses simultaneous reveal: a 'due'
-- feedback_forms row blocks the whole app until BOTH participants submit.
-- When one participant is an access-expired guest, they can never submit —
-- without this exclusion their counterpart (possibly a permanent member)
-- would be gated forever on a reveal that cannot complete (plan R13). The
-- counterpart's already-submitted feedback simply stays unrevealed; an
-- accepted trade-off.
--
-- The group path needs no counterpart exclusion: group_feedback rows are
-- per-reviewer with no reveal dependency (20260529100300) — an expired
-- guest's own due row gates only the guest, who is access-gated anyway.
--
-- Shaped as a SECURITY DEFINER RPC because the exclusion reads the
-- counterpart's profiles.access_expires_at, which is deliberately excluded
-- from the authenticated column grants (20260605100200) — the request-scoped
-- client cannot perform this join. Replacing the gate service's two queries
-- with one call also drops a per-request round trip. Minimum disclosure:
-- the caller learns only (kind, form_id) for their own gate.

CREATE OR REPLACE FUNCTION my_feedback_gate()
RETURNS TABLE (kind TEXT, form_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT kind, form_id FROM (
    (
      SELECT 1 AS prio, 'one_on_one'::TEXT AS kind, ff.id AS form_id
      FROM feedback_forms ff
      JOIN meetings m ON m.id = ff.meeting_id
      JOIN profiles counterpart ON counterpart.id =
        CASE WHEN m.participant_a = app.current_user_id()
             THEN m.participant_b
             ELSE m.participant_a
        END
      WHERE ff.reviewer_id = app.current_user_id()
        AND ff.state = 'due'
        AND (counterpart.access_expires_at IS NULL OR counterpart.access_expires_at > NOW())
      LIMIT 1
    )
    UNION ALL
    (
      SELECT 2 AS prio, 'group'::TEXT AS kind, gf.id AS form_id
      FROM group_feedback gf
      WHERE gf.reviewer_id = app.current_user_id()
        AND gf.state = 'due'
      LIMIT 1
    )
  ) candidates
  ORDER BY prio
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION my_feedback_gate() FROM public;
REVOKE EXECUTE ON FUNCTION my_feedback_gate() FROM anon;
GRANT EXECUTE ON FUNCTION my_feedback_gate() TO authenticated;

COMMENT ON FUNCTION my_feedback_gate() IS
  'Per-request feedback-gate check (one-on-one prioritized over group). Excludes one-on-one forms whose counterpart is access-expired so a vanished guest never gates their partner. Own gate only via app.current_user_id().';
