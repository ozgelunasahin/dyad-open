-- Idempotency ledger for Stripe webhook delivery.
--
-- One row per processed Stripe event id. The webhook records a row only AFTER
-- its synchronous handler work succeeds, so a failed handler leaves no row and
-- Stripe's retry re-runs it. Append-only; rows are never updated or deleted.
--
-- Service-role only. RLS is enabled with NO policy, and all grants are revoked
-- from authenticated/anon. BOTH halves are load-bearing: a policy without
-- grants, or grants without a policy, is a silent hole. The webhook writes via
-- the service-role admin client, which bypasses RLS entirely. No member ever
-- reads or writes this table.

CREATE TABLE IF NOT EXISTS processed_stripe_events (
	stripe_event_id TEXT PRIMARY KEY,
	processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE processed_stripe_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON processed_stripe_events FROM authenticated, anon;
GRANT SELECT, INSERT ON processed_stripe_events TO service_role;
