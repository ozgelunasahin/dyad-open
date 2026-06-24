import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Stripe event → membership entitlement dispatcher.
 *
 * The webhook endpoint (`/api/stripe/webhook`) owns transport: signature
 * verification, idempotency, and HTTP status. This module owns the translation
 * from a verified Stripe event into upserted `memberships` state.
 *
 * Contract (enforced by the endpoint, relied on here):
 *  - Called only with a signature-verified event.
 *  - Called at most once per event id under normal operation; on a retry the
 *    handler MUST be safe to run again — every write is an upsert on
 *    `identity_id`, so re-running converges rather than duplicating.
 *  - A throw means "transient failure, retry me": the endpoint returns 5xx and
 *    writes no idempotency row.
 *
 * Privacy: never log `event.data.object` or any sub-field beyond `event.id` /
 * `event.type`, and never log the `payment_ref ↔ identity_id` mapping.
 *
 * The per-event handlers are implemented in U5; U2 ships this dispatcher
 * skeleton so the endpoint has a stable seam to call.
 */
export interface StripeEventDeps {
	/** Service-role Supabase client — the only writer of `memberships`. */
	admin: SupabaseClient;
	/** Worker-compatible Stripe client, for re-fetching objects when an event
	 *  looks stale/out-of-order. */
	stripe: Stripe;
}

export async function dispatchStripeEvent(
	event: Stripe.Event,
	deps: StripeEventDeps
): Promise<void> {
	// `deps` (service-role client + Stripe client) is consumed by the per-event
	// handlers added in U5; the skeleton dispatcher does not yet need it.
	void deps;
	switch (event.type) {
		// Membership entitlement handlers are implemented in U5. Until then this
		// dispatcher is a no-op so the transport layer is independently shippable
		// and testable.
		default:
			// Stripe sends many event types; we only act on the membership-relevant
			// ones. Anything else is an intentional no-op (the endpoint still 200s
			// so Stripe stops retrying). Bounded log — type only, never payload.
			return;
	}
}
