import { makeAdminClient } from './supabase-admin.js';
import { PROTECTED_ACTIONS, type MembershipGating } from '$lib/domain/gating.js';

/**
 * Runtime-configurable settings read and written via the service-role client.
 * Backed by the `app_settings` table seeded in
 * supabase/migrations/20260522100000_add_app_settings.sql.
 */

const EMAIL_NOTIFICATIONS_ENABLED_KEY = 'email_notifications_enabled';
const MEMBERSHIP_GATING_KEY = 'membership_gating';

/** Read the global notification kill switch. Defaults to false on any error so
 *  a settings outage fails closed rather than spraying mail. */
export async function getEmailNotificationsEnabled(): Promise<boolean> {
	const admin = makeAdminClient();
	const { data, error } = await admin
		.from('app_settings')
		.select('value')
		.eq('key', EMAIL_NOTIFICATIONS_ENABLED_KEY)
		.maybeSingle();

	if (error) {
		console.error('[app-settings] read email_notifications_enabled failed:', error);
		return false;
	}
	return data?.value === true;
}

/** Set the global notification kill switch. Writes via service-role. Operator
 *  attribution is intentionally not stored — see the comment in the migration. */
export async function setEmailNotificationsEnabled(enabled: boolean): Promise<void> {
	const admin = makeAdminClient();
	const { error } = await admin
		.from('app_settings')
		.upsert(
			{
				key: EMAIL_NOTIFICATIONS_ENABLED_KEY,
				value: enabled,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'key' }
		);

	if (error) {
		console.error('[app-settings] write email_notifications_enabled failed:', error);
		throw error;
	}
}

/** Read the per-action membership gating config. Returns only known, boolean
 *  flags; an absent key or any error yields {} — gating off for every action
 *  (the activation default). The endpoint gate reads this; the RLS safety net
 *  reads the same `app_settings` row via app.gating_allows. */
export async function getMembershipGating(): Promise<MembershipGating> {
	const admin = makeAdminClient();
	const { data, error } = await admin
		.from('app_settings')
		.select('value')
		.eq('key', MEMBERSHIP_GATING_KEY)
		.maybeSingle();

	if (error) {
		console.error('[app-settings] read membership_gating failed:', error);
		return {};
	}
	const value = data?.value;
	if (!value || typeof value !== 'object') return {};

	const out: MembershipGating = {};
	for (const action of PROTECTED_ACTIONS) {
		const flag = (value as Record<string, unknown>)[action];
		if (typeof flag === 'boolean') out[action] = flag;
	}
	return out;
}

/** Replace the per-action membership gating config (service-role). Only known
 *  action keys with boolean values are persisted, so an unknown key can never
 *  enter the stored object. */
export async function setMembershipGating(gating: MembershipGating): Promise<void> {
	const clean: MembershipGating = {};
	for (const action of PROTECTED_ACTIONS) {
		const flag = gating[action];
		if (typeof flag === 'boolean') clean[action] = flag;
	}

	const admin = makeAdminClient();
	const { error } = await admin
		.from('app_settings')
		.upsert(
			{ key: MEMBERSHIP_GATING_KEY, value: clean, updated_at: new Date().toISOString() },
			{ onConflict: 'key' }
		);

	if (error) {
		console.error('[app-settings] write membership_gating failed:', error);
		throw error;
	}
}
