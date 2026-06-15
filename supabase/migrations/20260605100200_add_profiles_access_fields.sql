-- Member-level access window + home corner — conference-scoped access (U1).
--
-- access_expires_at: NULL = permanent member (everyone today). Non-null =
-- guest whose access ends entirely at that instant — the request gate in
-- src/hooks.server.ts sends expired guests to the access-ended page and
-- 403s their API calls. Admin extend = move the timestamp; convert to
-- permanent = clear it.
--
-- home_scope: NULL = commons (Berlin) context. Non-null = corner-exclusive
-- member: discover/search/profile listings show only this corner, map and
-- location search use the corner's region, new conversations default into
-- the corner. Cleared on convert-to-permanent.
--
-- The two fields are orthogonal on purpose: a Berlin member granted the
-- conference corner by admin has both NULL and is structurally unaffected.
--
-- Column-grant posture (mirrors 20260417100200): these columns are
-- deliberately NOT added to the authenticated column-scoped SELECT or
-- UPDATE grants on profiles. Other members cannot read guest status, and a
-- guest cannot un-gate themselves by editing their own expiry. The app
-- reads them via get_my_access_context() (20260605100400, own-row only) and
-- the service-role client.
--
-- See plan: docs/plans/2026-06-05-001-feat-conference-scoped-access-plan.md (U1, R4, R10, R15).

ALTER TABLE profiles
  ADD COLUMN access_expires_at TIMESTAMPTZ,
  ADD COLUMN home_scope TEXT REFERENCES scopes(scope);

COMMENT ON COLUMN profiles.access_expires_at IS
  'NULL = permanent member. Non-null = guest access window end; the hooks gate blocks the account after this instant. Excluded from authenticated column grants.';
COMMENT ON COLUMN profiles.home_scope IS
  'NULL = commons context. Non-null = corner-exclusive member (guest): all listing surfaces show only this corner. Excluded from authenticated column grants.';
