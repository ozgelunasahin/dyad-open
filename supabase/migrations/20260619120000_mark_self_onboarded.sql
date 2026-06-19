-- Persist onboarding completion durably.
--
-- The discover OnboardingModal previously only set a localStorage flag, so
-- profiles.onboarded never flipped. This RPC writes the durable flag for the
-- current user. (Downstream consumers key off profiles.onboarded — e.g. the
-- Resend "member" segment in the resend-segment-sync change.)
--
-- Uses the app.current_user_id() wrapper (not auth.uid() directly) per the
-- interop roadmap (see 20260418120000_add_app_current_user_id.sql).
--
-- Idempotent: the `onboarded IS DISTINCT FROM TRUE` guard makes a re-run for an
-- already-onboarded user a genuine no-op, so it does not churn updated_at or
-- re-fire UPDATE-driven triggers/webhooks. The existing update_profiles_updated_at
-- trigger maintains updated_at on the row that actually changes.
CREATE OR REPLACE FUNCTION mark_self_onboarded()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET onboarded = TRUE
  WHERE id = app.current_user_id()
    AND onboarded IS DISTINCT FROM TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION mark_self_onboarded() FROM public;
GRANT EXECUTE ON FUNCTION mark_self_onboarded() TO authenticated;
