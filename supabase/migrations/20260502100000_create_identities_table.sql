-- Phase D — D1: Create application-owned identities table + backfill.
-- Must be deployed together with D2 (20260502100100) — no traffic window between them.
--
-- After this migration:
--   identities.id = auth.users.id for all existing users (Supabase phase)
--   New signups will not create identities rows until D2 is deployed.

CREATE TABLE identities (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  substrate    TEXT        NOT NULL,
  substrate_id TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_substrate_identity UNIQUE (substrate, substrate_id)
);

CREATE INDEX idx_identities_lookup ON identities(substrate, substrate_id);

ALTER TABLE identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own identity"
  ON identities FOR SELECT TO authenticated
  USING (id = app.current_user_id());

GRANT SELECT ON identities TO authenticated;
GRANT INSERT, UPDATE ON identities TO service_role;

-- Backfill: one row per existing auth.users row.
-- identities.id mirrors auth.users.id so D3's FK migration is metadata-only.
INSERT INTO identities (id, substrate, substrate_id, created_at)
SELECT id, 'supabase', id::text, created_at
FROM auth.users
ON CONFLICT DO NOTHING;
