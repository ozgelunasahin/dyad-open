-- Fix signup flow: guard confirm_user_email to require a recently consumed invitation,
-- then re-grant to anon so the join page can call it.
--
-- The join flow calls use_invitation (marks invitation used) THEN confirm_user_email.
-- This guard ensures you can only confirm an email that has a recently consumed invitation.

CREATE OR REPLACE FUNCTION confirm_user_email(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only confirm if a recently consumed invitation exists for this email.
  -- FOR UPDATE prevents TOCTOU race on concurrent requests.
  -- Recency check (5 min) prevents stale invitation reuse.
  IF NOT EXISTS (
    SELECT 1 FROM invitations
    WHERE email = user_email
      AND used_at IS NOT NULL
      AND used_at > NOW() - INTERVAL '5 minutes'
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'No recently consumed invitation found for this email';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE email = user_email AND email_confirmed_at IS NULL;
END;
$$;

-- Re-grant to anon (was revoked in 20260326_fix_anon_function_access.sql)
-- Safe because the function now self-guards via invitation check + recency.
GRANT EXECUTE ON FUNCTION confirm_user_email(text) TO anon;
