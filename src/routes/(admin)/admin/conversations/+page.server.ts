import { makeAdminClient } from '$lib/server/supabase-admin';
import { buildProfileMap } from '$lib/server/username-lookup';
import type { PageServerLoad } from './$types';

/**
 * Admin Conversations view — every conversation across all states
 * (draft / published / archived), all members, all time horizons. Joins
 * each row with the author's username so the operator can see who wrote it.
 *
 * Bypasses RLS via the service-role client by design (admin plane convention,
 * see src/lib/server/supabase-admin.ts).
 */
export const load: PageServerLoad = async () => {
	const supabase = makeAdminClient();

	const { data: prompts } = await supabase
		.from('prompts')
		.select(
			'id, author_id, title, state, region, published_at, archived_at, hidden_at, created_at'
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
			state: p.state as 'draft' | 'published' | 'archived',
			region: p.region,
			published_at: p.published_at,
			archived_at: p.archived_at,
			hidden_at: p.hidden_at,
			created_at: p.created_at
		};
	});

	return { conversations };
};
