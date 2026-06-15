-- Drop the 4 admin RLS policies created in 20260408_admin_panel.sql.
--
-- Admin pages now use the service-role Supabase client (makeAdminClient),
-- which bypasses RLS by design. These policies became dead code the moment
-- the admin plane stopped using the session-bound (anon-key) client.
--
-- Keeping them invites confusion: a future developer might read them and
-- assume admin status flows through the JWT app_metadata claim, when in
-- fact the admin plane has no relationship to user auth at all.
--
-- See docs/solutions/identity-decoupling-security-tradeoffs.md and the
-- admin plane separation plan (docs/plans/2026-05-02-001-refactor-admin-
-- plane-separation-plan.md).
--
-- Non-admin policies on these tables (Users can insert feedback, Users
-- read own feedback, etc.) remain untouched.

DROP POLICY IF EXISTS "Admins can view contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can read invitations" ON invitations;
DROP POLICY IF EXISTS "Admins read all feedback" ON feedback;
