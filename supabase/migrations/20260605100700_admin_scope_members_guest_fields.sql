-- admin_scope_members gains guest fields — conference-scoped access (U8).
--
-- The scope detail view needs to show which members are guests (home corner
-- + access window) so the operator can extend windows or convert guests to
-- permanent members. Adds profiles.access_expires_at and profiles.home_scope
-- to the projection — admin plane only (service_role grant), so the
-- minimum-disclosure posture of the user-tier column grants is unaffected.
--
-- DROP + CREATE (not CREATE OR REPLACE): Postgres cannot change a function's
-- OUT parameters in place.

DROP FUNCTION IF EXISTS admin_scope_members(TEXT);

CREATE FUNCTION admin_scope_members(p_scope TEXT)
RETURNS TABLE (
  identity_id        UUID,
  username           TEXT,
  display_name       TEXT,
  granted_at         TIMESTAMPTZ,
  revoked_at         TIMESTAMPTZ,
  last_active_at     TIMESTAMPTZ,
  access_expires_at  TIMESTAMPTZ,
  home_scope         TEXT
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
    ) AS last_active_at,
    p.access_expires_at,
    p.home_scope
  FROM identity_scopes is_
  LEFT JOIN profiles p ON p.id = is_.identity_id
  WHERE is_.scope = p_scope
  ORDER BY is_.revoked_at NULLS FIRST, is_.granted_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION admin_scope_members(TEXT) FROM public;
REVOKE EXECUTE ON FUNCTION admin_scope_members(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION admin_scope_members(TEXT) TO service_role;

COMMENT ON FUNCTION admin_scope_members(TEXT) IS
  'Admin Scope detail view aggregation. Service-role only. Returns one row per (member, scope) grant incl. guest fields (access window, home corner). Last-active timestamp derived from app data only; no auth.users access.';
