-- Corner visibility primitive — foundational tables.
--
-- Adds the admin-managed `scopes` table and the `identity_scopes` junction
-- that together let the operator gate visibility of prompts to a curated
-- subset of authenticated members ("corners"). Prompts with a non-null
-- `audience_scope` (added in 20260508180100) are visible only to identities
-- holding a non-revoked grant for that scope.
--
-- See plan: prefig/docs/dyad/plans/2026-05-08-001-feat-corner-visibility-primitive-plan.md
-- See ideation: prefig/docs/dyad/ideation/2026-05-08-visibility-scope-corners-ideation.md
--
-- Three layers stay independent on purpose:
--   identity (who you are) — the upact port (identities table)
--   scope (what spaces you've been admitted to) — these tables
--   instance (which deploy) — implicit; one today
-- Scope is decoupled from substrate; substrate-as-scope was rejected.
--
-- Visibility filters belong in src/lib/services/prompt-query.ts listing
-- methods and on anon SELECT for prompts/time_slots only. Authenticated
-- direct-URL access remains FK-chain-governed (mirrors hidden_at precedent).

-- Step 1: create both tables. The scopes RLS policy references
-- identity_scopes, so identity_scopes must exist before that policy is
-- created.

CREATE TABLE scopes (
  scope        TEXT        PRIMARY KEY,
  name         TEXT        NOT NULL,
  description  TEXT,
  created_by   UUID        NOT NULL REFERENCES identities(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retired_at   TIMESTAMPTZ
);

CREATE TABLE identity_scopes (
  identity_id      UUID        NOT NULL REFERENCES identities(id),
  scope            TEXT        NOT NULL REFERENCES scopes(scope),
  -- granted_by is nullable: admin-originated grants have no user-identity
  -- attribution. Mirrors the invitations.invited_by precedent at
  -- src/routes/(admin)/admin/invites/api/+server.ts (admin endpoint hardcodes
  -- invited_by = NULL).
  granted_by       UUID        REFERENCES identities(id),
  granted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at  TIMESTAMPTZ,
  revoked_at       TIMESTAMPTZ,
  PRIMARY KEY (identity_id, scope)
);

-- Step 2: enable RLS and define policies.

ALTER TABLE scopes ENABLE ROW LEVEL SECURITY;

-- Narrow SELECT: a member sees only the scopes they hold a non-revoked grant
-- for. Prevents non-grantees from enumerating the corner directory (slug,
-- name, description). Admin pane uses service_role and bypasses RLS.
CREATE POLICY "Members read scopes they belong to"
  ON scopes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM identity_scopes
      WHERE identity_scopes.identity_id = app.current_user_id()
        AND identity_scopes.scope = scopes.scope
        AND identity_scopes.revoked_at IS NULL
    )
  );

GRANT SELECT ON scopes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON scopes TO service_role;

ALTER TABLE identity_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own grants"
  ON identity_scopes FOR SELECT TO authenticated
  USING (identity_id = app.current_user_id());

GRANT SELECT ON identity_scopes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON identity_scopes TO service_role;

-- Step 3: index supporting the per-request scope-membership lookup performed
-- in src/hooks.server.ts (only active grants are needed; revoked rows
-- skipped).

CREATE INDEX idx_identity_scopes_active
  ON identity_scopes(identity_id)
  WHERE revoked_at IS NULL;
