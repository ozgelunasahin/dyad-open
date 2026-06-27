import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { createStripeClient } from '$lib/server/stripe.js';
import { makeAdminClient } from '$lib/server/supabase-admin.js';
import { getOrCreateStripeCustomer } from '$lib/server/stripe-customer.js';

// The Customer Portal always lives under this host. We assert the returned URL
// starts with it before redirecting, so a misconfigured/forged value can never
// turn the portal endpoint into an open redirect.
const PORTAL_HOST = 'https://billing.stripe.com/';

/**
 * POST /api/membership/portal — open the Stripe Customer Portal for the actor
 * and return its URL for a full-page redirect.
 */
export const POST: RequestHandler = async ({ locals, url }) => {
	const actor = requireIdentity(locals);

	let stripe;
	try {
		stripe = createStripeClient(env.STRIPE_SECRET_KEY);
	} catch {
		return json({ error: 'unavailable' }, { status: 503 });
	}

	const admin = makeAdminClient();
	try {
		const customerId = await getOrCreateStripeCustomer(actor.id, stripe, admin);
		const returnUrl = env.STRIPE_PORTAL_RETURN_URL || `${url.origin}/membership`;
		const session = await stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: returnUrl
		});

		if (!session.url || !session.url.startsWith(PORTAL_HOST)) {
			console.error('[membership/portal] unexpected portal url:', session.url);
			return json({ error: 'portal_unavailable' }, { status: 500 });
		}
		return json({ url: session.url });
	} catch (err) {
		console.error('[membership/portal] stripe error:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'portal_failed' }, { status: 502 });
	}
};
