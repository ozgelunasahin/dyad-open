-- Vendor-neutral wrapper around auth.uid() for use in future RLS policies and
-- SECURITY DEFINER functions. See docs/solutions/architecture/sovereignty-lessons-learned.md §4
-- for why: auth.uid() is a Supabase extension; if we ever move off Supabase Auth
-- (to Authentik, Keycloak, a DID-backed service), we rewrite one function body
-- here instead of 38 existing policy references. New policies adopt the wrapper
-- from now on; existing auth.uid() call sites stay put until touched for other
-- reasons, per the 2026-04-17 interop roadmap.

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION app.current_user_id() FROM public;
GRANT EXECUTE ON FUNCTION app.current_user_id() TO authenticated, anon;
