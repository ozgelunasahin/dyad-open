-- Admin Members view — last-activity timestamp per member, derived from
-- application data only. Honors upact's minimum-disclosure posture: the
-- operator does not see auth.users (no last_sign_in_at, no email, no
-- created_at), only the latest meaningful interaction surfaced through
-- app-domain tables.
--
-- "Last active" is the most-recent of:
--   - prompts.updated_at where the member is the author
--   - prompt_comments.created_at where the member is the author
--   - prompt_invitations.created_at where the member is the inviter
--   - meetings.scheduled_time where the member is participant_a or _b
--
-- Members with no activity have last_active_at IS NULL.
--
-- SECURITY DEFINER + service_role-only GRANT so it can aggregate across
-- user-scoped tables that RLS would otherwise gate.
--
-- Future extension: when scopes / corners ship (see
-- ~/prefig/docs/dyad/ideation/2026-05-08-visibility-scope-corners-ideation.md),
-- a `corners text[]` column should join identity_scopes here.

CREATE OR REPLACE FUNCTION admin_member_activity()
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  last_active_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.display_name,
    GREATEST(
      (SELECT MAX(updated_at) FROM prompts WHERE author_id = p.id),
      (SELECT MAX(created_at) FROM prompt_comments WHERE author_id = p.id),
      (SELECT MAX(created_at) FROM prompt_invitations WHERE inviter_id = p.id),
      (SELECT MAX(scheduled_time) FROM meetings WHERE participant_a = p.id OR participant_b = p.id)
    ) AS last_active_at
  FROM profiles p
  ORDER BY last_active_at DESC NULLS LAST;
$$;

REVOKE EXECUTE ON FUNCTION admin_member_activity() FROM public;
REVOKE EXECUTE ON FUNCTION admin_member_activity() FROM authenticated;
GRANT EXECUTE ON FUNCTION admin_member_activity() TO service_role;

COMMENT ON FUNCTION admin_member_activity() IS
  'Admin Members view aggregation. Service-role only. Derives last-active timestamp from application data; does not touch auth.users (upact minimum-disclosure posture).';
