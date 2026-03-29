-- Restrict anonymous access to profiles table.
-- Previously GRANT ALL allowed anon to read/write all columns (username, referred_by, berlin_based, can_publish_sites, timestamps).
-- Now anon can only SELECT (id, username) — the minimum needed for landing page username display.

REVOKE ALL ON profiles FROM anon;
GRANT SELECT (id, username) ON profiles TO anon;
