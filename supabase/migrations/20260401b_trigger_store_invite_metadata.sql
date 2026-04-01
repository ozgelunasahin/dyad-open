-- Extend handle_new_user to persist join_motivation and referred_by
-- when passed via user_metadata (used by the referral signup flow).
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, berlin_based, join_motivation, referred_by)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    COALESCE((NEW.raw_user_meta_data->>'berlin_based')::boolean, FALSE),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'join_motivation', '')), ''),
    NULLIF(NEW.raw_user_meta_data->>'referred_by', '')::uuid
  );
  RETURN NEW;
END;
$$;
