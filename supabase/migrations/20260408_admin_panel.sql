-- Admin panel: migrate admin identity from can_publish_sites to app_metadata,
-- add RLS policies for the feedback table.
--
-- Admin identity check: (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
-- This cannot be modified by the client (app_metadata is immutable from user side).
--
-- Pre-requisite: set app_metadata for admin user(s) via Supabase dashboard:
-- UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
-- WHERE email = '<admin-email>';

-- 1. Migrate admin policies from can_publish_sites to app_metadata
-- Three policies in baseline use can_publish_sites: contacts, invitations (2)

DROP POLICY IF EXISTS "Admins can view contacts" ON contacts;
CREATE POLICY "Admins can view contacts"
  ON contacts FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can read invitations" ON invitations;
CREATE POLICY "Admins can read invitations"
  ON invitations FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 2. RLS policies for feedback table (legacy table reused for app feedback)
-- RLS is already enabled (baseline). INSERT policy already exists (baseline line 1114).
-- Add: users read own, admins read all.

CREATE POLICY "Users read own feedback"
  ON feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all feedback"
  ON feedback FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
