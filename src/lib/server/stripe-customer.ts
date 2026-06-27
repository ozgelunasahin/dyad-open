import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

/**
 * Membership ↔ Stripe linking helpers. Both write via the service-role `admin`
 * client (members have no write grant on `memberships`).
 *
 * payment_ref is the ONLY dyad value ever sent to Stripe — a random, opaque,
 * dyad-side token used as a Checkout Session's client_reference_id, the
 * subscription metadata, and the Stripe Customer metadata. It is NOT the actor
 * id (the Supabase substrate UUID), keeping dyad's master identifier out of
 * Stripe and the upact port swappable.
 */

/**
 * Ensure the actor's membership row carries a stable, opaque payment_ref and
 * return it. Does NOT clobber an existing entitlement: a comp/grant row keeps
 * its source/active/status; only the missing payment_ref is filled in. A
 * brand-new row is created as a pending paid intent (active=false) — the
 * webhook flips it active on checkout completion.
 */
export async function ensurePaymentRef(admin: SupabaseClient, userId: string): Promise<string> {
	const { data } = await admin
		.from('memberships')
		.select('payment_ref')
		.eq('identity_id', userId)
		.maybeSingle();
	if (data?.payment_ref) return data.payment_ref;

	const paymentRef = `pr_${nanoid(24)}`;
	if (data) {
		// Row exists without a ref (e.g. an operator grant) — set only payment_ref.
		const { error } = await admin
			.from('memberships')
			.update({ payment_ref: paymentRef })
			.eq('identity_id', userId);
		if (error) throw new Error(`payment_ref update failed: ${error.message}`);
		return paymentRef;
	}

	const { error } = await admin
		.from('memberships')
		.insert({ identity_id: userId, source: 'paid', active: false, payment_ref: paymentRef });
	if (error) {
		// Lost an insert race (PK conflict from a concurrent checkout) — re-read
		// and return the winner's ref rather than failing the checkout.
		const retry = await admin
			.from('memberships')
			.select('payment_ref')
			.eq('identity_id', userId)
			.maybeSingle();
		if (retry.data?.payment_ref) return retry.data.payment_ref;
		throw new Error(`payment_ref insert failed: ${error.message}`);
	}
	return paymentRef;
}

/**
 * Return the actor's Stripe Customer id, creating one lazily if absent. The
 * Customer is created with ONLY the opaque payment_ref in metadata — no email,
 * name, or address. The idempotency key is derived from payment_ref (never the
 * actor id, which would otherwise leak into Stripe's idempotency log).
 */
export async function getOrCreateStripeCustomer(
	userId: string,
	stripe: Stripe,
	admin: SupabaseClient
): Promise<string> {
	const { data } = await admin
		.from('memberships')
		.select('stripe_customer_id')
		.eq('identity_id', userId)
		.maybeSingle();
	if (data?.stripe_customer_id) return data.stripe_customer_id;

	const paymentRef = await ensurePaymentRef(admin, userId);
	const customer = await stripe.customers.create(
		{ metadata: { payment_ref: paymentRef } },
		{ idempotencyKey: `membership-customer:${paymentRef}` }
	);

	const { error } = await admin
		.from('memberships')
		.update({ stripe_customer_id: customer.id })
		.eq('identity_id', userId);
	if (error) throw new Error(`stripe_customer_id update failed: ${error.message}`);
	return customer.id;
}
