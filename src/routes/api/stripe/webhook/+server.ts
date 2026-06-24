import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type Stripe from 'stripe';
import { createStripeClient, cryptoProvider } from '$lib/server/stripe';
import { makeAdminClient } from '$lib/server/supabase-admin';
import { dispatchStripeEvent } from '$lib/server/membership-webhook';
import { deferEmail, notifyMembershipActivated } from '$lib/server/notification-emails';
import type { RequestHandler } from './$types';

/**
 * Stripe webhook — the single inbound payment surface.
 *
 * Order is security- and idempotency-first:
 *  1. Read the raw body ONCE — `constructEventAsync` must verify the exact bytes
 *     Stripe signed, and a second read throws.
 *  2. Verify the signature with `constructEventAsync` + the SubtleCrypto provider
 *     (the synchronous `constructEvent` uses node:crypto and cannot run on Workers).
 *  3. Idempotency SELECT — if this event id was already processed, 200 and stop.
 *  4. Run the handler synchronously. On throw → 5xx so Stripe retries; no row.
 *  5. Record the event id only AFTER the handler succeeds.
 *  6. 200.
 *
 * Opacity: responses and logs carry only `event.id` / `event.type`, never the
 * event payload. The webhook has no session and never enters the feedback gate.
 *
 * A missing signing secret → 503: the signature is the inbound auth, so we treat
 * an unconfigured deploy as "unavailable, retry" rather than silently dropping
 * payment events (mirrors the resend-sync secret-missing path).
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
	if (!webhookSecret) {
		console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured');
		return json({ error: 'unavailable' }, { status: 503 });
	}

	const signature = request.headers.get('stripe-signature');
	if (!signature) {
		return json({ error: 'missing signature' }, { status: 400 });
	}

	let body: string;
	try {
		body = await request.text();
	} catch {
		return json({ error: 'invalid body' }, { status: 400 });
	}
	if (!body) {
		return json({ error: 'empty body' }, { status: 400 });
	}

	let stripe: Stripe;
	try {
		stripe = createStripeClient(env.STRIPE_SECRET_KEY);
	} catch {
		console.error('[stripe-webhook] Stripe client unavailable (missing secret key)');
		return json({ error: 'unavailable' }, { status: 503 });
	}

	let event: Stripe.Event;
	try {
		event = await stripe.webhooks.constructEventAsync(
			body,
			signature,
			webhookSecret,
			undefined,
			cryptoProvider
		);
	} catch {
		// Bad signature, malformed payload, or a timestamp outside tolerance.
		return json({ error: 'invalid signature' }, { status: 400 });
	}

	let admin;
	try {
		admin = makeAdminClient();
	} catch {
		console.error('[stripe-webhook] admin client unavailable');
		return json({ error: 'unavailable' }, { status: 503 });
	}

	// Idempotency: skip events we've already processed (Stripe retries, replays).
	const { data: seen, error: seenErr } = await admin
		.from('processed_stripe_events')
		.select('stripe_event_id')
		.eq('stripe_event_id', event.id)
		.maybeSingle();
	if (seenErr) {
		console.error('[stripe-webhook] idempotency check failed:', seenErr.message);
		return json({ error: 'storage error' }, { status: 500 }); // retry
	}
	if (seen) {
		return json({ received: true, duplicate: true });
	}

	// Synchronous handler work. On throw, return 5xx and write NO idempotency
	// row so Stripe retries; handlers are upserts, so re-running is safe.
	try {
		await dispatchStripeEvent(event, {
			admin,
			stripe,
			onActivated: (userId) =>
				deferEmail(platform, notifyMembershipActivated({ userId }))
		});
	} catch (err) {
		console.error(
			`[stripe-webhook] handler failed for ${event.type}:`,
			err instanceof Error ? err.message : 'unknown error'
		);
		return json({ error: 'handler failed' }, { status: 500 });
	}

	// Record only after the handler succeeded.
	const { error: insErr } = await admin
		.from('processed_stripe_events')
		.insert({ stripe_event_id: event.id });
	if (insErr) {
		// A concurrent delivery may have recorded this id first (PK violation):
		// that's success — the work ran and the id is recorded. Any other error
		// returns 5xx so Stripe retries (the upsert handler stays idempotent).
		if (insErr.code === '23505') {
			return json({ received: true, duplicate: true });
		}
		console.error('[stripe-webhook] idempotency insert failed:', insErr.message);
		return json({ error: 'record failed' }, { status: 500 });
	}

	return json({ received: true });
};
