-- Drop get_registered_emails — SECURITY DEFINER function that returns all user emails.
-- Revoked from anon/authenticated in 20260326, but still callable by service_role.
-- No application code uses this function. Drop entirely.
DROP FUNCTION IF EXISTS get_registered_emails();
