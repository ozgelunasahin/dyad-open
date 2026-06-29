import type { PageServerLoad } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { EMAIL_NOTIFICATIONS_DEFAULT } from '$lib/domain/types.js';

export const load: PageServerLoad = async ({ locals }) => {
	const upactor = requireIdentity(locals);

	const [{ data, error }, { data: mem }] = await Promise.all([
		locals.supabase
			.from('notification_settings')
			.select('email, invitation_received, invitation_answered, meeting_cancelled')
			.eq('user_id', upactor.id)
			.maybeSingle(),
		// Display-only read (SELECT-own via RLS) — safe columns only, no payment_ref/stripe_*.
		locals.supabase
			.from('memberships')
			.select('active, cadence, source')
			.eq('identity_id', upactor.id)
			.maybeSingle()
	]);

	// A failed read renders the opted-out defaults; log so it isn't silent.
	if (error) {
		console.error('[preferences loader] notification_settings fetch failed:', error);
	}

	return {
		settings: {
			email: data?.email ?? null,
			invitation_received: data?.invitation_received ?? EMAIL_NOTIFICATIONS_DEFAULT,
			invitation_answered: data?.invitation_answered ?? EMAIL_NOTIFICATIONS_DEFAULT,
			meeting_cancelled: data?.meeting_cancelled ?? EMAIL_NOTIFICATIONS_DEFAULT
		},
		membership: mem
			? { active: mem.active as boolean, cadence: mem.cadence as string | null, source: mem.source as string }
			: null
	};
};
