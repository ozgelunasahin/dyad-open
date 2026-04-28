import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// All invitations, most recent first. Admin-only route (admin layout gates
	// it); we read all columns except the token itself, which stays
	// server-side — the re-send form doesn't need it, re-send just POSTs the
	// email back to /api/invites and the existing token is looked up there.
	const [{ data: invitations }, { data: admins }] = await Promise.all([
		locals.supabase
			.from('invitations')
			.select('id, email, expires_at, used_at, created_at, invited_by')
			.order('created_at', { ascending: false }),
		// Usernames of everyone who has ever sent an invite — small set, batched
		// once so the row render doesn't N+1.
		locals.supabase.from('profiles').select('id, username')
	]);

	const usernameById = new Map<string, string>();
	for (const a of admins ?? []) usernameById.set(a.id, a.username);

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
			invited_by_username: inv.invited_by ? (usernameById.get(inv.invited_by) ?? null) : null,
			status
		};
	});

	return { invites: rows };
};
