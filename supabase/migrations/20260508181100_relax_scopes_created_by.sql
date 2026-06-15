-- Relax scopes.created_by from NOT NULL to nullable.
--
-- The admin plane has no user identity (admin operator authenticates via
-- Cloudflare Access at the edge; their identity lives in CF, not in dyad's
-- identities table). The scope-creation endpoint cannot satisfy a NOT NULL
-- created_by FK without picking an arbitrary identity, which is dishonest.
--
-- This mirrors the precedent already established for:
--   - invitations.invited_by (NULL when admin-created)
--   - identity_scopes.granted_by (NULL when admin-originated grant; PR 28)
--
-- Existing rows: none yet (scopes table created in same release).
-- App impact: none beyond enabling the scope-creation endpoint to write
-- created_by = NULL.

ALTER TABLE scopes ALTER COLUMN created_by DROP NOT NULL;

COMMENT ON COLUMN scopes.created_by IS
  'Identity that created the scope, or NULL when created by admin (no user identity attribution available).';
