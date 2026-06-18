-- Resend segment sync: make Supabase the source of truth for which Resend
-- segment a person belongs to (waitlist / invited / member), and persist
-- onboarding completion so "member" actually means something durable.
--
-- This migration adds NO email-sending behaviour. It only exposes the read
-- model the webhook handler needs (contact_segment) and the write the
-- onboarding modal needs (mark_self_onboarded). The actual push to Resend
-- happens in the app (src/lib/server/resend-segments.ts), driven by a
-- Supabase Database Webhook on contacts / invitations / profiles. See
-- docs/resend-segment-sync.md for the webhook wiring.

-- ---------------------------------------------------------------------------
-- contact_segment(email): the single authority for a person's segment.
--
-- Precedence (highest wins):
--   member   — a confirmed account whose profile.onboarded = true
--   invited  — an invitation row exists for this email (sent, or already used
--              but onboarding not yet completed)
--   waitlist — on the contacts table, nothing further
--   NULL     — email is unknown to us (handler removes them from all segments)
--
-- Email is matched case-insensitively. SECURITY DEFINER because the webhook
-- handler runs as service_role and we want a stable contract regardless of the
-- caller's RLS context; it returns a single enum-like string, leaking no rows.
-- ---------------------------------------------------------------------------
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

-- Only the service-role webhook handler / backfill script needs this. No anon
-- or authenticated grant: segment membership is not per-user data they consume.
REVOKE EXECUTE ON FUNCTION contact_segment(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION contact_segment(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- mark_self_onboarded(): the onboarding modal's "done" persists here.
--
-- Until now, completing the 4-step modal only set a localStorage flag
-- (dyad_onboarding_done), so profiles.onboarded never flipped and nobody ever
-- became a Resend "member". This RPC writes the durable flag for the current
-- user; the resulting profiles UPDATE is what the webhook turns into a
-- segment move (invited -> member).
--
-- Uses the app.current_user_id() wrapper (not auth.uid() directly) per the
-- interop roadmap. Idempotent: re-running for an already-onboarded user is a
-- no-op write of the same value.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_self_onboarded()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET onboarded = TRUE,
      updated_at = NOW()
  WHERE id = app.current_user_id();
END;
$$;

REVOKE EXECUTE ON FUNCTION mark_self_onboarded() FROM public;
GRANT EXECUTE ON FUNCTION mark_self_onboarded() TO authenticated;
