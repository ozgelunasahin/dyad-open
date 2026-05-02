-- Move admin role from auth.users.app_metadata (Supabase-specific) to
-- profiles.is_admin (application-owned). Admin status now lives on the
-- application identity rather than the auth substrate — it survives a
-- provider swap.
--
-- Security model:
--   - Only service_role can write is_admin (not in the authenticated UPDATE grant)
--   - Authenticated users can read is_admin (added to SELECT grant — not sensitive)
--   - Default false; explicit grant required for every admin

ALTER TABLE profiles
  ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Extend the column-level SELECT grant to include is_admin.
-- Reading another user's admin status is not sensitive.
GRANT SELECT (is_admin) ON profiles TO authenticated;

-- Backfill from Supabase app_metadata — one-time, substrate-specific.
-- After this migration, is_admin is the authoritative source.
UPDATE profiles
SET is_admin = true
FROM auth.users
WHERE profiles.id = auth.users.id
  AND (auth.users.raw_app_meta_data->>'role') = 'admin';
