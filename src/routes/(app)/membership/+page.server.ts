import { dev } from '$app/environment';
import { requireIdentity } from '$lib/services/identity.js';
import type { PageServerLoad } from './$types';

// Dev-only preview fixtures so the membership surfaces can be viewed in every
// state without real Stripe data (see /dev/membership). `dev` is false in a
// production build, so this branch is inert and never returns a fixture in prod.
const PREVIEW_STATES: Record<
	string,
	{ active: boolean; cadence: string | null; source: string; currentPeriodEnd: string | null } | null
> = {
	guest: null,
	lapsed: { active: false, cadence: 'annual', source: 'paid', currentPeriodEnd: null },
	active: { active: true, cadence: 'annual', source: 'paid', currentPeriodEnd: null },
	lifetime: { active: true, cadence: 'lifetime', source: 'paid', currentPeriodEnd: null },
	comp: { active: true, cadence: null, source: 'comp', currentPeriodEnd: null }
};

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	// Lets the checkout-return poll re-run just this loader (not the whole
	// (app) layout) via invalidate('membership:status').
	depends('membership:status');

	if (dev) {
		const preview = url.searchParams.get('preview');
		if (preview && preview in PREVIEW_STATES) {
			return { membership: PREVIEW_STATES[preview] };
		}
	}

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
