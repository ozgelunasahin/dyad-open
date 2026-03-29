-- ============================================
-- Fix handle_new_user: add SET search_path (security hardening)
-- and ensure the trigger binding exists on auth.users.
-- ============================================

-- Recreate with SET search_path = public (was missing from baseline)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, berlin_based)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    COALESCE((NEW.raw_user_meta_data->>'berlin_based')::boolean, FALSE)
  );
  RETURN NEW;
END;
$$;

-- Tighten grants: trigger functions don't need direct EXECUTE
REVOKE EXECUTE ON FUNCTION handle_new_user FROM public, anon, authenticated;

-- Ensure trigger binding exists (may be missing on local/fresh deploys)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
