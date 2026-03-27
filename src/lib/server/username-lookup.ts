import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Build a Map of user IDs to usernames from the profiles table.
 * Filters out any IDs not found in the database.
 */
export async function buildUsernameMap(
	supabase: SupabaseClient,
	userIds: string[]
): Promise<Map<string, string>> {
	if (userIds.length === 0) return new Map();

	const uniqueIds = Array.from(new Set(userIds));
	const { data: profiles } = await supabase
		.from('profiles')
		.select('id, username')
		.in('id', uniqueIds);

	return new Map(profiles?.map((p) => [p.id, p.username]) ?? []);
}
