import { makeAdminClient } from '$lib/server/supabase-admin';
import { buildProfileMap } from '$lib/server/username-lookup';
import type { PageServerLoad } from './$types';

/**
 * Admin Conversations view — every conversation across all states
 * (draft / published), all members, all time horizons. Joins each row with
 * the author's username so the operator can see who wrote it.
 *
 * Bypasses RLS via the service-role client by design (admin plane convention,
 * see src/lib/server/supabase-admin.ts).
 */
export const load: PageServerLoad = async ({ url }) => {
	const supabase = makeAdminClient();

	// When the admin pane is served from admin.dyad.berlin, the relative
	// link "/conversations/X" resolves to admin.dyad.berlin/conversations/X —
	// which is not where the user-facing app lives. Compute the apex URL so
	// links to user routes jump to the correct origin. In local dev
	// (localhost:5173, no subdomain) apexBase is '' and links stay relative.
	const apexBase = url.hostname.startsWith('admin.')
		? `${url.protocol}//${url.hostname.replace(/^admin\./, '')}`
		: '';

	const { data: prompts } = await supabase
		.from('prompts')
		.select(
			'id, author_id, title, state, region, published_at, hidden_at, created_at'
		)
		.order('created_at', { ascending: false });

	const rows = prompts ?? [];

	const authorIds = rows.map((p) => p.author_id);
	const profiles = await buildProfileMap(supabase, authorIds);

	const conversations = rows.map((p) => {
		const profile = profiles.get(p.author_id);
		return {
			id: p.id,
			title: p.title,
			author_id: p.author_id,
			author_username: profile?.username ?? null,
			author_display_name: profile?.display_name ?? null,
			state: p.state as 'draft' | 'published',
			region: p.region,
			published_at: p.published_at,
			hidden_at: p.hidden_at,
			created_at: p.created_at
		};
	});

	return { conversations, apexBase };
};
