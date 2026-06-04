import type { SupabaseClient } from '@supabase/supabase-js';
import type { GateStatus } from '$lib/domain/types.js';

export interface GateService {
	checkGate(userId: string): Promise<GateStatus>;
}

export class SupabaseGateService implements GateService {
	constructor(private supabase: SupabaseClient) {}

	async checkGate(userId: string): Promise<GateStatus> {
		// One-on-one path (unchanged): a due per-pair feedback_forms row gates the
		// user and routes to the existing reveal-capable modal/page.
		const { data, error } = await this.supabase
			.from('feedback_forms')
			.select('id')
			.eq('reviewer_id', userId)
			.eq('state', 'due')
			.limit(1)
			.maybeSingle();

		if (error) {
			// Fail open — don't block on DB errors
			return { gated: false };
		}

		if (data) {
			return { gated: true, kind: 'one_on_one', formId: data.id };
		}

		// Group path (R5/U11): a due group_feedback row gates the user once per
		// gathering and routes to the simple group feedback page. Checked second
		// so the one-on-one path keeps priority; a user only ever has one of the
		// two for a given gathering.
		const { data: groupData, error: groupError } = await this.supabase
			.from('group_feedback')
			.select('id')
			.eq('reviewer_id', userId)
			.eq('state', 'due')
			.limit(1)
			.maybeSingle();

		if (groupError) {
			// Fail open — don't block on DB errors
			return { gated: false };
		}

		if (groupData) {
			return { gated: true, kind: 'group', formId: groupData.id };
		}

		return { gated: false };
	}
}
