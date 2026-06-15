-- Global runtime configuration the admin plane can flip without a redeploy.
-- One-row-per-key settings table read and written exclusively by the service-
-- role client (admin plane + server-side notification gate). No anon or
-- authenticated access — settings are not per-user data.
--
-- Seeded with `email_notifications_enabled = false` so the transactional
-- notification paths added in this PR are dark by default. The admin
-- /admin/settings page is the only surface that flips it.

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- An operator-attribution column is intentionally omitted. Admin operators
-- are Cloudflare Access principals, not Supabase users or identities, so a
-- foreign key to either table would be misleading. When/if CF Access identity
-- is surfaced into the admin plane, re-add this as `updated_by TEXT` and write
-- the operator email at the call site.

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- No policies: anon and authenticated roles have no access. The service-role
-- client used by the admin plane (makeAdminClient) and by the server-side
-- notification dispatch bypasses RLS, which is the only path that needs to
-- read or write this table.
--
-- This row's security posture is RLS-on + no-grants. If a future change needs
-- to expose this table to authenticated callers, you must ADD A POLICY *and*
-- the matching column GRANTs (see 20260417100200 for the pattern). Flipping
-- only one of them is a silent vulnerability.

INSERT INTO app_settings (key, value)
VALUES ('email_notifications_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
