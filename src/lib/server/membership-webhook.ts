import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MembershipCadence } from '$lib/domain/types.js';
import { SupabaseMembershipService } from '$lib/services/membership.js';

/**
 * Stripe event → membership entitlement dispatcher.
 *
 * The webhook endpoint (`/api/stripe/webhook`) owns transport: signature
 * verification, idempotency, and HTTP status. This module translates a verified
 * Stripe event into upserted `memberships` state.
 *
 * Contract (enforced by the endpoint, relied on here):
 *  - Called only with a signature-verified event.
 *  - Every write is an upsert on identity_id, so a Stripe retry re-runs safely.
 *  - A throw means "transient failure, retry me" (the endpoint 5xxs, no idem row).
 *
 * Recompute, don't trust the payload: subscription state is always re-fetched
 * from the Stripe API, so out-of-order or stale events converge on current state.
 *
 * Resolution never trusts a client-supplied id: the row is found by the opaque
 * payment_ref (set server-side) or by stored Stripe ids — never by the actor id.
 *
 * Privacy: never log `event.data.object` or sub-fields beyond `event.id` /
 * `event.type`, and never log the payment_ref ↔ identity_id mapping.
 */
export interface StripeEventDeps {
	/** Service-role Supabase client — the only writer of `memberships`. */
	admin: SupabaseClient;
	/** Worker-compatible Stripe client, for re-fetching authoritative state. */
	stripe: Stripe;
}

// past_due KEEPS access (Stripe's dunning window — no bespoke grace logic, R6).
// incomplete / canceled / unpaid / incomplete_expired are NOT active.
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due']);

interface MembershipRow {
	identity_id: string;
	stripe_subscription_id: string | null;
	stripe_customer_id: string | null;
}

function strOrNull(v: string | { id: string } | null | undefined): string | null {
	if (!v) return null;
	return typeof v === 'string' ? v : v.id;
}

/** Period end as ISO. Reads the item-level field (current Stripe API); the
 *  top-level read is a backward-compat fallback for pre-2024 API versions. */
function periodEndIso(sub: Stripe.Subscription): string | null {
	const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
	const epoch = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
	return epoch ? new Date(epoch * 1000).toISOString() : null;
}

/** Find the membership row by the opaque payment_ref or stored Stripe ids.
 *  Throws on a DB error (so the webhook retries); returns null when no row
 *  matches (a genuine anomaly — checkout always creates the row first). */
async function resolveMembership(
	admin: SupabaseClient,
	keys: { paymentRef?: string | null; subscriptionId?: string | null; customerId?: string | null }
): Promise<MembershipRow | null> {
	const cols = 'identity_id, stripe_subscription_id, stripe_customer_id';
	const lookups: Array<[string, string | null | undefined]> = [
		['payment_ref', keys.paymentRef],
		['stripe_subscription_id', keys.subscriptionId],
		['stripe_customer_id', keys.customerId]
	];
	for (const [col, val] of lookups) {
		if (!val) continue;
		const { data, error } = await admin.from('memberships').select(cols).eq(col, val).maybeSingle();
		if (error) throw new Error(`membership lookup failed: ${error.message}`);
		if (data) return data as MembershipRow;
	}
	return null;
}

/** Re-fetch a subscription and write its current state to the membership row. */
async function applySubscription(deps: StripeEventDeps, subscriptionId: string): Promise<void> {
	const sub = await deps.stripe.subscriptions.retrieve(subscriptionId);
	const row = await resolveMembership(deps.admin, {
		subscriptionId: sub.id,
		paymentRef: sub.metadata?.payment_ref,
		customerId: strOrNull(sub.customer)
	});
	if (!row) {
		console.error('[membership-webhook] subscription event: no membership row');
		return;
	}
	const interval = sub.items?.data?.[0]?.price?.recurring?.interval;
	const cadence: MembershipCadence | null =
		interval === 'year' ? 'annual' : interval === 'month' ? 'monthly' : null;
	const customerId = strOrNull(sub.customer);

	await new SupabaseMembershipService(deps.admin).updateMembership(row.identity_id, {
		source: 'paid',
		cadence,
		status: sub.status,
		active: ACTIVE_SUBSCRIPTION_STATUSES.has(sub.status),
		current_period_end: periodEndIso(sub),
		stripe_subscription_id: sub.id,
		// Don't clobber a stored customer id with null if a payload omits it —
		// the refund/dispute path resolves by stripe_customer_id.
		...(customerId ? { stripe_customer_id: customerId } : {})
	});
}

async function handleCheckoutCompleted(
	event: Stripe.Event,
	deps: StripeEventDeps
): Promise<void> {
	const session = event.data.object as Stripe.Checkout.Session;
	const row = await resolveMembership(deps.admin, { paymentRef: session.client_reference_id });
	if (!row) {
		console.error('[membership-webhook] checkout.session.completed: no membership row for ref');
		return;
	}
	const service = new SupabaseMembershipService(deps.admin);
	const customerId = strOrNull(session.customer);

	if (session.mode === 'payment') {
		// Lifetime. If the actor still had a live subscription, cancel it at Stripe
		// before nulling the id — otherwise it keeps billing while dyad stops tracking.
		// Tolerate an already-terminal subscription (resource_missing / already
		// canceled): that's an expected, non-transient condition, not a reason to
		// fail the webhook and trap the paid-for lifetime entitlement in a retry loop.
		if (row.stripe_subscription_id) {
			try {
				await deps.stripe.subscriptions.cancel(row.stripe_subscription_id);
			} catch (err) {
				console.error(
					'[membership-webhook] prior subscription cancel failed (continuing):',
					err instanceof Error ? err.message : 'unknown'
				);
			}
		}
		await service.updateMembership(row.identity_id, {
			source: 'paid',
			cadence: 'lifetime',
			status: null,
			active: true,
			stripe_customer_id: customerId,
			stripe_subscription_id: null,
			current_period_end: null
		});
		return;
	}

	// Subscription mode: record the ids, then apply the subscription's state.
	const subscriptionId = strOrNull(session.subscription);
	await service.updateMembership(row.identity_id, {
		source: 'paid',
		stripe_customer_id: customerId,
		stripe_subscription_id: subscriptionId
	});
	if (subscriptionId) await applySubscription(deps, subscriptionId);
}

/** Handle a refund/dispute for a Stripe customer. For a lifetime row this IS the
 *  revocation path (active=false). For a subscription-backed row it must NOT
 *  blanket-revoke — a refund of one invoice on a still-live subscription would
 *  wrongly lock the member out — so we recompute authoritative state from the
 *  subscription instead; genuine loss flows through subscription.* events. */
async function revokeByCustomer(
	deps: StripeEventDeps,
	customer: string | { id: string } | null | undefined
): Promise<void> {
	const customerId = strOrNull(customer);
	if (!customerId) {
		console.error('[membership-webhook] refund/dispute without a customer id');
		return;
	}
	const row = await resolveMembership(deps.admin, { customerId });
	if (!row) {
		console.error('[membership-webhook] refund/dispute: no membership row');
		return;
	}
	if (row.stripe_subscription_id) {
		// Subscription-backed (a lifetime row has stripe_subscription_id = null).
		await applySubscription(deps, row.stripe_subscription_id);
		return;
	}
	await new SupabaseMembershipService(deps.admin).updateMembership(row.identity_id, {
		active: false
	});
}

export async function dispatchStripeEvent(
	event: Stripe.Event,
	deps: StripeEventDeps
): Promise<void> {
	switch (event.type) {
		case 'checkout.session.completed':
			return handleCheckoutCompleted(event, deps);

		case 'customer.subscription.created':
		case 'customer.subscription.updated':
		case 'customer.subscription.deleted': {
			const sub = event.data.object as Stripe.Subscription;
			return applySubscription(deps, sub.id);
		}

		case 'invoice.paid':
		case 'invoice.payment_failed': {
			// Current Stripe API nests the subscription link under
			// parent.subscription_details.subscription; `subscription` at top level
			// is a legacy (pre-2024) fallback.
			const invoice = event.data.object as Stripe.Invoice & {
				subscription?: string | { id: string } | null;
			};
			const subRef = invoice.parent?.subscription_details?.subscription ?? invoice.subscription;
			const subId = strOrNull(subRef);
			if (subId) return applySubscription(deps, subId);
			return;
		}

		case 'charge.refunded': {
			const charge = event.data.object as Stripe.Charge;
			// `refunded` is true only on a FULL refund — partials keep access.
			if (charge.refunded) return revokeByCustomer(deps, charge.customer);
			return;
		}

		case 'charge.dispute.created': {
			const dispute = event.data.object as Stripe.Dispute;
			const chargeId = strOrNull(dispute.charge);
			if (!chargeId) return;
			const charge = await deps.stripe.charges.retrieve(chargeId);
			return revokeByCustomer(deps, charge.customer);
		}

		default:
			// Not a membership-relevant event — intentional no-op (the endpoint
			// still 200s so Stripe stops retrying). Bounded: no payload logged.
			return;
	}
}
