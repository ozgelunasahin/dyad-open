-- contact_segment(email): the single authority for which Resend segment a
-- person belongs to (waitlist / invited / member). Supabase is the source of
-- truth; the app and the backfill script read this and reconcile Resend to match.
-- This migration adds NO email-sending behaviour and stores no new data.
--
-- Precedence (highest wins):
--   member   — a confirmed account whose profile.onboarded = true
--   invited  — an invitation row exists for this email
--   waitlist — on the contacts table, nothing further
--   NULL     — email is unknown to us (the caller removes them from all segments)
--
-- Email is matched case-insensitively. SECURITY DEFINER because the webhook
-- handler / backfill run as service_role and we want a stable contract; it
-- returns a single enum-like string and leaks no rows.
--
-- Portability note: this reads auth.users directly to resolve email -> confirmed
-- account. That is a deliberate, contained dependency on the Supabase auth
-- schema (there is no email column on profiles). When identity moves off Supabase
-- Auth (see app.current_user_id() in 20260418120000), this single function body
-- is the one place to rewrite — do not spread auth.users reads further.
CREATE OR REPLACE FUNCTION contact_segment(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email     TEXT := LOWER(BTRIM(p_email));
  v_user_id   UUID;
  v_onboarded BOOLEAN;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN NULL;
  END IF;

  -- Confirmed account for this email?
  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE LOWER(u.email) = v_email
    AND u.email_confirmed_at IS NOT NULL
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    SELECT p.onboarded INTO v_onboarded FROM profiles p WHERE p.id = v_user_id;
    IF COALESCE(v_onboarded, FALSE) THEN
      RETURN 'member';
    END IF;
  END IF;

  -- Invited (invitation exists, used or not) but not yet a full member.
  IF EXISTS (SELECT 1 FROM invitations i WHERE LOWER(i.email) = v_email) THEN
    RETURN 'invited';
  END IF;

  -- On the waitlist.
  IF EXISTS (SELECT 1 FROM contacts c WHERE LOWER(c.email) = v_email) THEN
    RETURN 'waitlist';
  END IF;

  RETURN NULL;
END;
$$;

-- Only the service-role webhook handler / backfill need this; segment membership
-- is not per-user data that anon/authenticated clients consume.
REVOKE EXECUTE ON FUNCTION contact_segment(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION contact_segment(TEXT) TO service_role;
