-- Phase D — D2: Update handle_new_user trigger to create identities row first.
-- Must be deployed together with D1 (20260502100000) — no traffic window between them.
--
-- Also applies the join_motivation + referred_by population that
-- 20260401b_trigger_store_invite_metadata.sql introduced but was never applied
-- (the b-suffix filename caused the CLI to skip it).

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create identity record first (profiles.id will reference identities.id after D3)
  INSERT INTO identities (id, substrate, substrate_id)
  VALUES (NEW.id, 'supabase', NEW.id::text)
  ON CONFLICT (substrate, substrate_id) DO NOTHING;

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
