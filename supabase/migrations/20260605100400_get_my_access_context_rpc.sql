-- Per-request access context — conference-scoped access (U1).
--
-- One call replaces the raw identity_scopes select in src/hooks.server.ts
-- and adds the access-gate fields. Returns, for the calling member only
-- (app.current_user_id()):
--
--   scopes            — active grant slugs, joined against scopes.retired_at
--                       IS NULL. This intentionally fixes a pre-existing
--                       inconsistency: hooks loaded grants without the
--                       retired filter while listMyScopes applied it, so
--                       locals.scopes could disagree with the scope list.
--   access_expires_at — profiles gate field (column-grant-excluded, hence
--                       SECURITY DEFINER; this function is the only
--                       authenticated read path and it is own-row only).
--   home_scope        — corner-exclusive context, or NULL for commons.
--   home_region       — the home scope's region key, or NULL.
--
-- See plan: docs/plans/2026-06-05-001-feat-conference-scoped-access-plan.md (U1, R6, R10).

CREATE OR REPLACE FUNCTION get_my_access_context()
RETURNS TABLE (
  scopes            TEXT[],
  access_expires_at TIMESTAMPTZ,
  home_scope        TEXT,
  home_region       TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(
      ARRAY(
        SELECT i.scope
        FROM identity_scopes i
        JOIN scopes s ON s.scope = i.scope
        WHERE i.identity_id = app.current_user_id()
          AND i.revoked_at IS NULL
          AND s.retired_at IS NULL
        ORDER BY i.scope
      ),
      '{}'
    ) AS scopes,
    p.access_expires_at,
    p.home_scope,
    hs.region AS home_region
  FROM profiles p
  LEFT JOIN scopes hs ON hs.scope = p.home_scope
  WHERE p.id = app.current_user_id();
$$;

REVOKE EXECUTE ON FUNCTION get_my_access_context() FROM public;
REVOKE EXECUTE ON FUNCTION get_my_access_context() FROM anon;
GRANT EXECUTE ON FUNCTION get_my_access_context() TO authenticated;

COMMENT ON FUNCTION get_my_access_context() IS
  'Per-request context for the hooks gate and scope filters: active non-retired scope slugs, access expiry, home corner + its region. Own row only via app.current_user_id(); the only authenticated read path for the column-grant-excluded profiles access fields.';
