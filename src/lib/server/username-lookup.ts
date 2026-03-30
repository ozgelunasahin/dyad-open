import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Build a Map of user IDs to usernames from the profiles table.
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

/**
 * Build a Map of user IDs to { username, display_name } from the profiles table.
 */
export async function buildProfileMap(
	supabase: SupabaseClient,
	userIds: string[]
): Promise<Map<string, { username: string; display_name: string | null }>> {
	if (userIds.length === 0) return new Map();

	const uniqueIds = Array.from(new Set(userIds));
	const { data: profiles } = await supabase
		.from('profiles')
		.select('id, username, display_name')
		.in('id', uniqueIds);

	return new Map(profiles?.map((p) => [p.id, { username: p.username, display_name: p.display_name ?? null }]) ?? []);
}
