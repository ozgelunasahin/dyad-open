import type { SupabaseClient } from '@supabase/supabase-js';
import type { GateStatus } from '$lib/domain/types.js';

export interface GateService {
	checkGate(userId: string): Promise<GateStatus>;
}

export class SupabaseGateService implements GateService {
	constructor(private supabase: SupabaseClient) {}

	async checkGate(_userId: string): Promise<GateStatus> {
		// One round trip for both gate paths (one-on-one prioritized over
		// group), keyed on app.current_user_id() inside the RPC. The RPC also
		// excludes one-on-one forms whose counterpart is access-expired — a
		// vanished guest must never gate their partner on a reveal that cannot
		// complete. See migration 20260605100600.
		const { data, error } = await this.supabase.rpc('my_feedback_gate');

		if (error) {
			// Fail open — don't block on DB errors
			return { gated: false };
		}

		const row = (data as Array<{ kind: 'one_on_one' | 'group'; form_id: string }> | null)?.[0];
		if (row) {
			return { gated: true, kind: row.kind, formId: row.form_id };
		}

		return { gated: false };
	}
}
