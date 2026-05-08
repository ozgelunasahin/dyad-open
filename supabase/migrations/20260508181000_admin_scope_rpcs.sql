-- Admin Scopes view — RPCs supporting /admin/scopes (list) and
-- /admin/scopes/[scope] (detail). Mirrors the minimum-disclosure shape of
-- admin_member_activity (PR 26): SECURITY DEFINER, service_role-only GRANT,
-- narrow projection so the operator sees what the verb requires and nothing
-- more.
--
-- admin_scopes_overview() — one row per non-retired scope, with member and
-- post counts. List view consumer.
--
-- admin_scope_members(p_scope) — one row per identity that holds (or has
-- held) a grant for the named scope. Detail view consumer.
--
-- See plan: prefig/docs/dyad/plans/2026-05-08-001-feat-corner-visibility-primitive-plan.md (Unit 4).

CREATE OR REPLACE FUNCTION admin_scopes_overview()
RETURNS TABLE (
  scope          TEXT,
  name           TEXT,
  description    TEXT,
  created_at     TIMESTAMPTZ,
  retired_at     TIMESTAMPTZ,
  member_count   INTEGER,
  post_count     INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.scope,
    s.name,
    s.description,
    s.created_at,
    s.retired_at,
    (SELECT COUNT(*)::INTEGER FROM identity_scopes
       WHERE identity_scopes.scope = s.scope
         AND identity_scopes.revoked_at IS NULL) AS member_count,
    (SELECT COUNT(*)::INTEGER FROM prompts
       WHERE prompts.audience_scope = s.scope) AS post_count
  FROM scopes s
  ORDER BY s.retired_at NULLS FIRST, s.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION admin_scopes_overview() FROM public;
REVOKE EXECUTE ON FUNCTION admin_scopes_overview() FROM authenticated;
GRANT EXECUTE ON FUNCTION admin_scopes_overview() TO service_role;

COMMENT ON FUNCTION admin_scopes_overview() IS
  'Admin Scopes list view aggregation. Service-role only. Returns one row per scope with member and post counts; honors minimum-disclosure (no per-member detail).';

CREATE OR REPLACE FUNCTION admin_scope_members(p_scope TEXT)
RETURNS TABLE (
  identity_id     UUID,
  username        TEXT,
  display_name    TEXT,
  granted_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  last_active_at  TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    is_.identity_id,
    p.username,
    p.display_name,
    is_.granted_at,
    is_.revoked_at,
    GREATEST(
      (SELECT MAX(updated_at) FROM prompts WHERE author_id = is_.identity_id),
      (SELECT MAX(created_at) FROM prompt_comments WHERE author_id = is_.identity_id),
      (SELECT MAX(created_at) FROM prompt_invitations WHERE inviter_id = is_.identity_id),
      (SELECT MAX(scheduled_time) FROM meetings
         WHERE participant_a = is_.identity_id OR participant_b = is_.identity_id)
    ) AS last_active_at
  FROM identity_scopes is_
  LEFT JOIN profiles p ON p.id = is_.identity_id
  WHERE is_.scope = p_scope
  ORDER BY is_.revoked_at NULLS FIRST, is_.granted_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION admin_scope_members(TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION admin_scope_members(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION admin_scope_members(TEXT) TO service_role;

COMMENT ON FUNCTION admin_scope_members(TEXT) IS
  'Admin Scope detail view aggregation. Service-role only. Returns one row per (member, scope) grant. Last-active timestamp derived from app data only; no auth.users access.';
