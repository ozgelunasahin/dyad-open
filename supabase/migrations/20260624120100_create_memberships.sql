-- Membership entitlement — one row per actor, opaque-only, actor-keyed.
--
-- This table is dyad's entitlement store. It holds NO payment PII: no email,
-- name, address, card, or phone — only opaque Stripe references, a derived
-- `active` flag, and the cadence/source. Stripe is the data controller for
-- payment data (see /datenschutz); dyad keeps only what gating needs.
--
-- payment_ref is the ONLY dyad-side value ever sent to Stripe (as a Checkout
-- Session's client_reference_id and the subscription metadata). It is a random,
-- dyad-generated token — NOT the actor id (which is the Supabase substrate
-- UUID). This keeps dyad's master identifier out of Stripe's store and keeps
-- the upact identity port swappable: see the upact spec § "No identifiers
-- outside the contract". Operator-granted rows (comp/founding/grandfathered)
-- never touch Stripe, so their payment_ref stays NULL.
--
-- Writes are service-role only: members get SELECT on their own row (for the
-- /membership page and the gate check) but NO write grant, so a member can
-- never self-INSERT active=true. The REVOKE is explicit so a future stray
-- grant cannot reopen that hole (mirrors processed_stripe_events / app_settings).

CREATE TABLE IF NOT EXISTS memberships (
	identity_id UUID PRIMARY KEY REFERENCES identities(id) ON DELETE CASCADE,
	-- Opaque, dyad-generated token; the only dyad value Stripe ever sees.
	-- UNIQUE so the webhook can resolve actor <- payment_ref. NULL for grants.
	payment_ref TEXT UNIQUE,
	cadence TEXT CHECK (cadence IS NULL OR cadence IN ('monthly', 'annual', 'lifetime')),
	source TEXT NOT NULL CHECK (source IN ('paid', 'comp', 'founding', 'grandfathered')),
	status TEXT, -- Stripe subscription status; NULL for lifetime / granted rows
	stripe_customer_id TEXT,
	stripe_subscription_id TEXT, -- NULL for lifetime / granted rows
	current_period_end TIMESTAMPTZ, -- NULL = perpetual (lifetime / granted)
	active BOOLEAN NOT NULL DEFAULT false,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The webhook resolves the row by these opaque references on subscription /
-- customer events and reads with .maybeSingle(), which errors on >1 match.
-- Partial UNIQUE enforces the one-actor-per-customer / per-subscription
-- invariant the resolver assumes; NULLs are free (operator-granted rows never
-- touch Stripe). payment_ref already has a unique index from its constraint.
CREATE UNIQUE INDEX IF NOT EXISTS memberships_stripe_customer_id_key
	ON memberships (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS memberships_stripe_subscription_id_key
	ON memberships (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_memberships_updated_at ON memberships;
CREATE TRIGGER update_memberships_updated_at
	BEFORE UPDATE ON memberships
	FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Members read only their own entitlement; another member's row is invisible.
DROP POLICY IF EXISTS "Members read own membership" ON memberships;
CREATE POLICY "Members read own membership"
	ON memberships FOR SELECT TO authenticated
	USING (app.current_user_id() = identity_id);

-- Supabase grants ALL on new public tables to the app roles by default. Pare
-- members back to SELECT only: no INSERT/UPDATE/DELETE grant means writes are
-- service-role only (the webhook and operator grant). service_role keeps its
-- default ALL and is the sole writer.
REVOKE ALL ON memberships FROM authenticated, anon;
GRANT SELECT ON memberships TO authenticated;
