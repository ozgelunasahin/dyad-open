import { redirect } from '@sveltejs/kit';
import { firstAccessContextRow } from '$lib/server/access-context.js';
import type { PageServerLoad } from './$types';

/**
 * Access-ended landing page for expired guests (plan R10). The hooks gate
 * redirects every page navigation here once a guest's window has passed;
 * the path itself is gate-exempt so it stays reachable.
 *
 * This load re-derives the expiry state itself (the gate's exemption means
 * hooks did not populate locals for this path) and bounces non-expired
 * visitors away — a permanent member typing the URL sees their app, not a
 * dead end.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		redirect(302, '/login');
	}

	const { data: ctxRows } = await locals.supabase.rpc('get_my_access_context');
	const ctx = firstAccessContextRow(ctxRows);

	const expired =
		ctx?.access_expires_at && new Date(ctx.access_expires_at).getTime() < Date.now();
	if (!expired) {
		redirect(302, '/discover');
	}

	// The guest still holds their (unrevoked) grant, so RLS lets them read
	// their own corner's name.
	let cornerName: string | null = null;
	if (ctx?.home_scope) {
		const { data: scopeRow } = await locals.supabase
			.from('scopes')
			.select('name')
			.eq('scope', ctx.home_scope)
			.maybeSingle();
		cornerName = scopeRow?.name ?? null;
	}

	return { cornerName };
};
