import type { SupabaseClient } from '@supabase/supabase-js';
import type { Membership, MembershipCadence, MembershipSource } from '$lib/domain/types.js';

/**
 * Fields the webhook (U5) and operator grant (U9) upsert. `identity_id` keys
 * the row; everything else is optional so a partial event (e.g. a status-only
 * subscription.updated) overwrites just what it knows. All writes go through a
 * service-role client — members have no write grant on `memberships`.
 */
export interface MembershipUpsert {
	identity_id: string;
	payment_ref?: string | null;
	cadence?: MembershipCadence | null;
	source?: MembershipSource;
	status?: string | null;
	stripe_customer_id?: string | null;
	stripe_subscription_id?: string | null;
	current_period_end?: string | null;
	active?: boolean;
}

export interface MembershipService {
	/** The actor's own membership row, or null if they have none. */
	getMembership(userId: string): Promise<Membership | null>;
	/** Whether the actor currently holds an active entitlement. */
	isActive(userId: string): Promise<boolean>;
	/** Create-or-update the row keyed on identity_id (service-role only). */
	upsertMembership(membership: MembershipUpsert): Promise<void>;
}

// Opaque references included so the webhook can read back the prior Stripe ids
// when reconciling; the client UI must never receive these (see U8).
const MEMBERSHIP_COLUMNS =
	'identity_id, payment_ref, cadence, source, status, current_period_end, active, stripe_customer_id, stripe_subscription_id';

export class SupabaseMembershipService implements MembershipService {
	constructor(private supabase: SupabaseClient) {}

	async getMembership(userId: string): Promise<Membership | null> {
		const { data, error } = await this.supabase
			.from('memberships')
			.select(MEMBERSHIP_COLUMNS)
			.eq('identity_id', userId)
			.maybeSingle();
		if (error) {
			console.error('[membership] getMembership failed:', error.message);
			return null;
		}
		return (data as Membership | null) ?? null;
	}

	async isActive(userId: string): Promise<boolean> {
		const { data, error } = await this.supabase
			.from('memberships')
			.select('active')
			.eq('identity_id', userId)
			.maybeSingle();
		if (error) {
			// No reliable signal — report not-active. The endpoint gate (U7)
			// decides whether to fail open; this read stays conservative.
			console.error('[membership] isActive failed:', error.message);
			return false;
		}
		return data?.active === true;
	}

	async upsertMembership(membership: MembershipUpsert): Promise<void> {
		const { error } = await this.supabase
			.from('memberships')
			.upsert(
				{ ...membership, updated_at: new Date().toISOString() },
				{ onConflict: 'identity_id' }
			);
		if (error) {
			// Writers are the webhook / operator grant. Surface the failure so the
			// webhook returns 5xx and Stripe retries the (idempotent) upsert.
			throw new Error(`membership upsert failed: ${error.message}`);
		}
	}
}
