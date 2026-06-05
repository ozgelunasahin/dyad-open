import { makeAdminClient } from '$lib/server/supabase-admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Admin plane: service-role client, no user/session context.
	const supabase = makeAdminClient();

	// Two parallel queries — no FK between contacts and invitations (merge by email)
	const [{ data: contacts }, { data: invitations }] = await Promise.all([
		supabase
			.from('contacts')
			.select('id, email, name, based_in, freewrite, referral_source, created_at')
			.order('created_at', { ascending: false }),
		supabase
			.from('invitations')
			.select('email, token, used_at, expires_at, created_at')
	]);

	// Build invitation lookup by email
	const inviteMap = new Map<string, { used: boolean; expired: boolean; token: string; created_at: string }>();
	for (const inv of invitations ?? []) {
		const existing = inviteMap.get(inv.email);
		// Keep the most recent invitation per email
		if (!existing || inv.created_at > existing.created_at) {
			inviteMap.set(inv.email, {
				used: inv.used_at !== null,
				expired: !inv.used_at && new Date(inv.expires_at) < new Date(),
				token: inv.token,
				created_at: inv.created_at
			});
		}
	}

	// Merge contacts with invitation status
	const waitlist = (contacts ?? []).map(c => {
		const inv = inviteMap.get(c.email);
		let status: 'not_invited' | 'invited' | 'expired' | 'signed_up' = 'not_invited';
		if (inv?.used) status = 'signed_up';
		else if (inv && !inv.expired) status = 'invited';
		else if (inv?.expired) status = 'expired';

		return { ...c, status };
	});

	return { waitlist };
};
