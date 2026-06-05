-- Group invite links — conference-scoped access (U1).
--
-- A group link is a reusable, shareable invite (QR on a conference slide)
-- bound to a scope. Unlike `invitations` (single-use, email-bound, token =
-- email security invariant), a group link is redeemed many times by
-- anonymous strangers during a join window, optionally capped, and stamps a
-- guest access expiry onto every member it creates.
--
-- Deliberately a separate table from `invitations`: overloading the
-- single-use shape would contaminate validate_invitation/use_invitation
-- semantics and the token=email binding in the join action.
--
-- Access posture: NO anon or authenticated access at all. Every read goes
-- through the admin plane (service_role) or the join action's server-side
-- admin client; redemption goes through redeem_group_invite_link
-- (20260605100300). RLS is enabled with no policies as defense in depth on
-- top of the revoked grants.
--
-- No attribution column: group links are admin-plane-originated, and the
-- admin plane has no user identity (operator identity lives in Cloudflare
-- Access). Mirrors invitations.invited_by = NULL convention without
-- carrying a dead column.
--
-- See plan: docs/plans/2026-06-05-001-feat-conference-scoped-access-plan.md (U1, R1-R3).

CREATE TABLE group_invite_links (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token             TEXT        NOT NULL UNIQUE,
  scope             TEXT        NOT NULL REFERENCES scopes(scope),
  label             TEXT,
  join_closes_at    TIMESTAMPTZ NOT NULL,
  -- Stamped onto profiles.access_expires_at for every member who joins via
  -- this link. Joining after access has ended makes no sense:
  access_expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT group_invite_links_window CHECK (join_closes_at <= access_expires_at),
  max_redemptions   INTEGER     CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redemption_count  INTEGER     NOT NULL DEFAULT 0,
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE group_invite_links ENABLE ROW LEVEL SECURITY;

-- Supabase default privileges grant table access broadly; revoke everything
-- below service_role. No policies exist, so even a stray grant would expose
-- zero rows — but the revoke keeps the grant surface honest.
REVOKE ALL ON group_invite_links FROM anon;
REVOKE ALL ON group_invite_links FROM authenticated;
GRANT ALL ON group_invite_links TO service_role;

-- Admin list view: links per scope, newest first.
CREATE INDEX idx_group_invite_links_scope ON group_invite_links(scope, created_at DESC);
