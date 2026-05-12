-- Drift guard for the auth.uid() -> app.current_user_id() migration.
--
-- This function returns the list of RLS policies on public-schema tables
-- that still reference auth.uid() directly. The companion integration test
-- (tests/integration/rls-no-auth-uid-drift.test.ts) asserts the list is
-- empty. Used because supabase-js can't query pg_policies directly via
-- PostgREST.
--
-- service_role-only: the admin/test client gets EXECUTE; nobody else.

CREATE OR REPLACE FUNCTION public.audit_rls_policies_using_auth_uid()
RETURNS TABLE (
  tablename text,
  policyname text,
  qual_uses_auth_uid boolean,
  with_check_uses_auth_uid boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    p.tablename::text,
    p.policyname::text,
    COALESCE(p.qual ~* '\bauth\.uid\s*\(', false) AS qual_uses_auth_uid,
    COALESCE(p.with_check ~* '\bauth\.uid\s*\(', false) AS with_check_uses_auth_uid
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND (p.qual ~* '\bauth\.uid\s*\(' OR p.with_check ~* '\bauth\.uid\s*\(');
$$;

REVOKE EXECUTE ON FUNCTION public.audit_rls_policies_using_auth_uid() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_rls_policies_using_auth_uid() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_rls_policies_using_auth_uid() FROM anon;
GRANT EXECUTE ON FUNCTION public.audit_rls_policies_using_auth_uid() TO service_role;
