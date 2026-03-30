-- Fully revoke anon access to profiles.
-- The public landing page no longer queries usernames — anonymised placeholders
-- are generated server-side without touching the profiles table.
-- Previous migration (20260412) granted SELECT (id, username) to anon;
-- this migration removes even that.

REVOKE ALL ON profiles FROM anon;
