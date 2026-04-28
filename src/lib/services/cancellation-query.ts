import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared lookup for cancelled meetings: maps meeting_id → the id and username
 * of the participant who cancelled it, plus the reason they gave. Used wherever
 * cancelled meetings are rendered, so attribution ("You cancelled" vs "@x
 * cancelled") and the note text stay correct across every surface.
 */
export interface CancellerInfo {
	cancelled_by: string;
	cancelled_by_username: string | null;
	reason: string | null;
}

export async function loadCancellersFor(
	supabase: SupabaseClient,
	meetingIds: string[]
): Promise<Map<string, CancellerInfo>> {
	const result = new Map<string, CancellerInfo>();
	if (meetingIds.length === 0) return result;

	const { data: records } = await supabase
		.from('cancellation_records')
		.select('meeting_id, cancelled_by, reason, cancelled_at, id')
		.in('meeting_id', meetingIds)
		// Tie-breaker on id keeps attribution stable when two records share
		// an exact cancelled_at timestamp (possible on idempotent retries).
		.order('cancelled_at', { ascending: false })
		.order('id', { ascending: false });

	if (!records || records.length === 0) return result;

	// Keep only the most-recent record per meeting (records ordered desc).
	const latestByMeeting = new Map<string, { cancelled_by: string; reason: string | null }>();
	for (const r of records) {
		if (!latestByMeeting.has(r.meeting_id)) {
			latestByMeeting.set(r.meeting_id, {
				cancelled_by: r.cancelled_by,
				reason: r.reason ?? null
			});
		}
	}

	const cancellerIds = [...new Set([...latestByMeeting.values()].map((v) => v.cancelled_by))];
	const { data: profiles } = await supabase
		.from('profiles')
		.select('id, username')
		.in('id', cancellerIds);

	const usernameById = new Map<string, string>();
	for (const p of profiles ?? []) usernameById.set(p.id, p.username);

	for (const [meetingId, v] of latestByMeeting) {
		result.set(meetingId, {
			cancelled_by: v.cancelled_by,
			cancelled_by_username: usernameById.get(v.cancelled_by) ?? null,
			reason: v.reason
		});
	}
	return result;
}
