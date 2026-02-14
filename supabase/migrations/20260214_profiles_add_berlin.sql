-- Add berlin_based flag to profiles
ALTER TABLE profiles ADD COLUMN berlin_based BOOLEAN NOT NULL DEFAULT FALSE;

-- Update handle_new_user trigger to read berlin_based from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
