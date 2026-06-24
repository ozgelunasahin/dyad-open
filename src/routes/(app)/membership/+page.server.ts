import { requireIdentity } from '$lib/services/identity.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, depends }) => {
	// Lets the checkout-return poll re-run just this loader (not the whole
	// (app) layout) via invalidate('membership:status').
	depends('membership:status');
	const actor = requireIdentity(locals);

	// SELECT-own via RLS, and only the safe display columns — the opaque
	// payment_ref / stripe_* references are never serialized to the client.
	const { data } = await locals.supabase
		.from('memberships')
		.select('active, cadence, source, current_period_end')
		.eq('identity_id', actor.id)
		.maybeSingle();

	return {
		membership: data
			? {
					active: data.active as boolean,
					cadence: data.cadence as string | null,
					source: data.source as string,
					currentPeriodEnd: data.current_period_end as string | null
				}
			: null
	};
};
