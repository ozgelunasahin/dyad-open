-- Security fixes: restrict archive function, fix notifications INSERT policy.
-- Deploy FIRST in the migration batch — archive_stale_prompts is currently callable by anon.

-- 1. Restrict archive_stale_prompts to service_role only
REVOKE EXECUTE ON FUNCTION archive_stale_prompts FROM public;
GRANT EXECUTE ON FUNCTION archive_stale_prompts TO service_role;

-- 2. Fix notifications INSERT policy — currently any authenticated user can insert
--    notifications for any other user. Restrict to own user_id.
DROP POLICY IF EXISTS "Insert notifications for authenticated users" ON notifications;
CREATE POLICY "Insert own notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
