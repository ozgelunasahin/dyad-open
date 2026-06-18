import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Persist onboarding completion for the current user.
 *
 * The discover OnboardingModal previously only set a localStorage flag, so
 * profiles.onboarded never flipped and nobody graduated to the Resend "member"
 * segment. This endpoint calls mark_self_onboarded() (which writes onboarded =
 * true for app.current_user_id()); the resulting profiles UPDATE is what the
 * resend-sync webhook turns into an invited -> member move.
 *
 * Idempotent and fire-and-forget from the client's perspective — the modal
 * still closes instantly off localStorage; this just makes it durable.
 */
export const POST: RequestHandler = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { error } = await locals.supabase.rpc('mark_self_onboarded');
	if (error) {
		console.error('[onboarding] mark_self_onboarded failed:', error.message);
		return json({ ok: false }, { status: 500 });
	}

	return json({ ok: true });
};
