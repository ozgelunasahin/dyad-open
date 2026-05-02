import { makeAdminClient } from '$lib/server/supabase-admin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Admin plane: service-role client, no user/session context.
	const supabase = makeAdminClient();

	const { data: feedbackEntries } = await supabase
		.from('feedback')
		.select('id, user_id, type, description, context, status, created_at')
		.order('created_at', { ascending: false });

	// Look up usernames for user_ids (no FK — parallel lookup pattern)
	const userIds = [...new Set((feedbackEntries ?? []).map(f => f.user_id))];
	const { data: profiles } = userIds.length > 0
		? await supabase.from('profiles').select('id, username').in('id', userIds)
		: { data: [] };

	const usernameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.username]));

	const entries = (feedbackEntries ?? []).map(f => ({
		...f,
		username: usernameMap.get(f.user_id) ?? null,
		pageUrl: (f.context as any)?.page_url ?? null,
		userAgent: (f.context as any)?.user_agent ?? null
	}));

	return { entries };
};
