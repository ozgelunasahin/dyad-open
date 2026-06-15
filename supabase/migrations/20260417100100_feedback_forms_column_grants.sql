-- Lock down direct UPDATE on feedback_forms to content columns only.
--
-- Previous grant (20260401_create_feedback_forms.sql:85):
--   GRANT UPDATE ON feedback_forms TO authenticated;
--
-- This let any reviewer PATCH /rest/v1/feedback_forms?id=eq.<own> and force
-- state='locked' / locked_at=<now> / submitted_at=<now>, bypassing the
-- submit_feedback RPC's simultaneous-reveal invariant (both parties must
-- submit before state transitions to 'locked').
--
-- Scope the grant to the content columns the reviewer is legitimately allowed
-- to edit. State transitions (state, submitted_at, locked_at) remain writable
-- only via the submit_feedback RPC, which is SECURITY DEFINER and bypasses
-- column grants. Row-level RLS ("Reviewer updates own form") remains in place
-- as the actor guard.
--
-- Design note: a full REVOKE would also work, but column-scoped grants keep
-- the door open for a future client-side draft auto-save of feedback content.
-- The attack surface is the state columns; protect them specifically.

REVOKE UPDATE ON feedback_forms FROM authenticated;

GRANT UPDATE (
  did_meet,
  no_show_reason,
  rating_tags,
  free_text,
  share_with_person,
  share_with_platform,
  platform_comments
) ON feedback_forms TO authenticated;
