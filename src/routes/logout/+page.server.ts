import { redirect } from '@sveltejs/kit';
import type { Session } from '@prefig/upact';
import type { Actions } from './$types';

/**
 * POST-only logout. A GET hits the +page.svelte with a manual sign-out button;
 * cross-origin `<img src="/logout">` or prefetch can no longer sign the user
 * out by accident (was a CSRF hazard when /logout was a GET `load` action).
 */
export const actions: Actions = {
	default: async ({ locals }) => {
		// See note in (auth)/login/+page.server.ts — both current adapters
		// ignore the Session param and read their own cookie state.
		try {
			await locals.identityPort.invalidate({} as Session);
		} catch {
			// Fail open: redirect even if the substrate is unavailable.
		}
		redirect(303, '/');
	}
};
