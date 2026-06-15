-- Restrict authenticated-role access to profiles.
--
-- Baseline (20260101_baseline.sql:1090):
--   CREATE POLICY "Public profiles are viewable by everyone"
--     ON profiles FOR SELECT USING (true);
--   GRANT ALL ON profiles TO authenticated;
--
-- Combined, these let any authenticated user PostgREST-SELECT every column of
-- every profile row, including referred_by (the referral graph) and
-- join_motivation (the freewrite a new user submitted during signup). These
-- fields are not read from the authenticated role anywhere in the app — the
-- admin panel uses service_role. ALSO let any authenticated user UPDATE any
-- column of their OWN profile, so an attacker could re-attribute themselves
-- to another inviter by writing `referred_by`.
--
-- Two migrations already scoped the anon role (20260412, 20260413). This
-- applies the same pattern to the authenticated role, now covering BOTH
-- SELECT and UPDATE with column-level grants.
--
-- Scope of change:
--   - Drop the permissive "USING (true)" SELECT policy.
--   - Replace with "authenticated users can read" — still permissive at the
--     row level, because usernames and display names are public within the
--     logged-in surface.
--   - Revoke the broad GRANT ALL and replace with column-scoped SELECT (safe
--     public-ish fields) and column-scoped UPDATE (self-editable fields).
--     Sensitive columns (referred_by, join_motivation, can_publish_sites,
--     updated_at) become authenticated-invisible AND authenticated-unwritable.
--   - INSERT is re-granted at table level because Postgres column-scoped
--     INSERT grants don't cover the common "insert with defaults" path; the
--     handle_new_user trigger and the "Users can insert their own profile"
--     RLS policy handle row creation.
--
-- Idempotency: DROP POLICY IF EXISTS guards re-apply. REVOKE/GRANT are
-- naturally replayable. Safe under `supabase db reset` and preview-branch
-- restore.

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read profile summaries" ON profiles;

CREATE POLICY "Authenticated users can read profile summaries"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

REVOKE ALL ON profiles FROM authenticated;

GRANT SELECT (
  id,
  username,
  display_name,
  avatar_url,
  berlin_based,
  onboarded,
  created_at
) ON profiles TO authenticated;

-- Column-scoped UPDATE: only fields a user should be able to self-edit.
-- referred_by / join_motivation / can_publish_sites / updated_at stay
-- unwritable by authenticated, so no re-attribution via direct PATCH.
GRANT UPDATE (
  username,
  display_name,
  avatar_url,
  berlin_based,
  onboarded
) ON profiles TO authenticated;

-- INSERT still needs table-level privilege. RLS policy
-- "Users can insert their own profile" (20260101_baseline.sql:1126) is the
-- row-level guard, and the handle_new_user trigger handles new-user row
-- creation on signup.
GRANT INSERT ON profiles TO authenticated;
