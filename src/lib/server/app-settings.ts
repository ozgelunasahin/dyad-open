import { makeAdminClient } from './supabase-admin.js';

/**
 * Runtime-configurable settings read and written via the service-role client.
 * Backed by the `app_settings` table seeded in
 * supabase/migrations/20260522100000_add_app_settings.sql.
 */

const EMAIL_NOTIFICATIONS_ENABLED_KEY = 'email_notifications_enabled';

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
