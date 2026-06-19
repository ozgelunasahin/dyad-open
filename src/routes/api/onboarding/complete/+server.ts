import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Persist onboarding completion for the current user.
 *
 * The discover OnboardingModal previously only set a localStorage flag, so
 * profiles.onboarded never flipped. This endpoint calls mark_self_onboarded(),
 * which writes onboarded = true for app.current_user_id().
 *
 * Idempotent. The discover page retries on the next visit until it succeeds, so
 * a dropped request never silently leaves a member un-onboarded.
 */
export const POST: RequestHandler = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { error } = await locals.supabase.rpc('mark_self_onboarded');
	if (error) {
		console.error('[onboarding] mark_self_onboarded failed:', error.message);
		return json({ error: 'Failed to complete onboarding' }, { status: 500 });
	}

	return json({ ok: true });
};
