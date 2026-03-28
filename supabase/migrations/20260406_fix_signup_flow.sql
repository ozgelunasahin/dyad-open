-- Fix signup flow: guard confirm_user_email to require a consumed invitation,
-- then re-grant to anon so the join page can call it.
--
-- The join flow calls use_invitation (marks invitation used) THEN confirm_user_email.
-- This guard ensures you can only confirm an email that has a consumed invitation.

CREATE OR REPLACE FUNCTION confirm_user_email(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only confirm if a consumed (used) invitation exists for this email
  IF NOT EXISTS (
    SELECT 1 FROM invitations
    WHERE email = user_email
      AND used_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'No consumed invitation found for this email';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE email = user_email AND email_confirmed_at IS NULL;
END;
$$;

-- Re-grant to anon (was revoked in 20260326_fix_anon_function_access.sql)
-- Safe because the function now self-guards via invitation check.
GRANT EXECUTE ON FUNCTION confirm_user_email(text) TO anon;
