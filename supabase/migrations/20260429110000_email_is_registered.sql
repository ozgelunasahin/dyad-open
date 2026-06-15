-- email_is_registered(email): returns TRUE iff a confirmed user exists for the email.
--
-- Used by the public /api/contact (waitlist) endpoint to short-circuit a
-- confirmation flow when someone who is already a member tries to sign up
-- to the waitlist again. Returns false for unconfirmed users so half-finished
-- signups don't lock people out of the waitlist.
--
-- SECURITY: SECURITY DEFINER + email-only argument means callers learn one
-- bit of information (is this email a member?). That's the same bit they
-- would learn by attempting an OTP login flow, so this RPC is not a new
-- enumeration vector. Return type is BOOLEAN — no row data leaks.

CREATE OR REPLACE FUNCTION email_is_registered(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF p_email IS NULL OR BTRIM(p_email) = '' THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE LOWER(email) = LOWER(BTRIM(p_email))
      AND email_confirmed_at IS NOT NULL
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION email_is_registered(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION email_is_registered(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION email_is_registered(TEXT) TO authenticated;
