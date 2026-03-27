import type { SupabaseClient } from '@supabase/supabase-js';
import type { GateStatus } from '$lib/domain/types.js';

export interface GateService {
	checkGate(userId: string): Promise<GateStatus>;
}

export class SupabaseGateService implements GateService {
	constructor(private supabase: SupabaseClient) {}

	async checkGate(userId: string): Promise<GateStatus> {
		const { data, error } = await this.supabase
			.from('feedback_forms')
			.select('id')
			.eq('reviewer_id', userId)
			.eq('state', 'due')
			.limit(1)
			.maybeSingle();

		if (error) {
			// Fail open — don't block on DB errors
			return { gated: false, feedbackFormId: null };
		}

		if (data) {
			return { gated: true, feedbackFormId: data.id };
		}

		return { gated: false, feedbackFormId: null };
	}
}
