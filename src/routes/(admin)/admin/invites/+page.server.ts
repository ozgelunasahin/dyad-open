import { makeAdminClient } from '$lib/server/supabase-admin';
import type { PageServerLoad } from './$types';

export interface ActiveScope {
	scope: string;
	name: string;
}

export const load: PageServerLoad = async () => {
	// Admin plane: service-role client, no user/session context.
	const supabase = makeAdminClient();

	// All invitations, most recent first. Token stays server-side — re-send
	// looks up the existing token by email. Active scopes are loaded
	// alongside (small set) so the invite form can offer an optional scope
	// picker — the redeemed invitation auto-grants the scope at signup.
	const [{ data: invitations }, { data: scopes }] = await Promise.all([
		supabase
			.from('invitations')
			.select('id, email, expires_at, used_at, created_at, scope')
			.order('created_at', { ascending: false }),
		supabase
			.from('scopes')
			.select('scope, name')
			.is('retired_at', null)
			.order('name')
	]);

	const now = Date.now();
	const rows = (invitations ?? []).map((inv) => {
		const expires = new Date(inv.expires_at).getTime();
		let status: 'pending' | 'expired' | 'used';
		if (inv.used_at) status = 'used';
		else if (expires < now) status = 'expired';
		else status = 'pending';

		return {
			id: inv.id,
			email: inv.email,
			created_at: inv.created_at,
			expires_at: inv.expires_at,
			used_at: inv.used_at,
			scope: inv.scope ?? null,
			status
		};
	});

	return { invites: rows, activeScopes: (scopes ?? []) as ActiveScope[] };
};
