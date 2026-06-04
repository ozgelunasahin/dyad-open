import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, createAuthenticatedClient, TEST_USERS } from '../helpers/auth.js';

/**
 * notification_settings — strictly opt-in notification email + per-event flags.
 *
 * The table (migration `20260604090000_granular_email_notification_prefs.sql`)
 * is owner-only for every verb because the address is PII: unlike the
 * profiles table there is no permissive cross-member SELECT policy. The
 * /api/profile/preferences endpoint upserts through the *user-scoped* client,
 * so these policies are the real enforcement. Dispatch reads via the
 * service-role client and sends only when an address exists.
 */
const LISA_ADDR = 'lisa-notify@test.invalid';

describe('notification_settings — owner-only, opt-in', () => {
	const admin = createAdminClient();
	let lisa: SupabaseClient;
	let marco: SupabaseClient;

	async function adminRead(userId: string) {
		const { data } = await admin
			.from('notification_settings')
			.select('email, invitation_received, invitation_answered, meeting_cancelled')
			.eq('user_id', userId)
			.maybeSingle();
		return data;
	}

	async function cleanup() {
		await admin
			.from('notification_settings')
			.delete()
			.in('user_id', [TEST_USERS.lisa.id, TEST_USERS.marco.id]);
	}

	beforeAll(async () => {
		[lisa, marco] = await Promise.all([
			createAuthenticatedClient(TEST_USERS.lisa.email, TEST_USERS.lisa.password),
			createAuthenticatedClient(TEST_USERS.marco.email, TEST_USERS.marco.password)
		]);
		await cleanup();
	});

	afterAll(async () => {
		// Leave the shared integration DB as we found it: opted out.
		await cleanup();
	});

	it('lets a member opt in by upserting their own row with an address', async () => {
		const { error } = await lisa
			.from('notification_settings')
			.upsert({ user_id: TEST_USERS.lisa.id, email: LISA_ADDR }, { onConflict: 'user_id' });
		expect(error, error?.message).toBeNull();

		expect(await adminRead(TEST_USERS.lisa.id)).toEqual({
			email: LISA_ADDR,
			invitation_received: true,
			invitation_answered: true,
			meeting_cancelled: true
		});
	});

	it('lets a member flip one event flag without touching the others', async () => {
		const { error } = await lisa
			.from('notification_settings')
			.update({ invitation_answered: false })
			.eq('user_id', TEST_USERS.lisa.id);
		expect(error, error?.message).toBeNull();

		expect(await adminRead(TEST_USERS.lisa.id)).toEqual({
			email: LISA_ADDR,
			invitation_received: true,
			invitation_answered: false,
			meeting_cancelled: true
		});
	});

	it("does not let a member read another member's notification address", async () => {
		const { data, error } = await marco
			.from('notification_settings')
			.select('email')
			.eq('user_id', TEST_USERS.lisa.id)
			.maybeSingle();
		expect(error, error?.message).toBeNull();
		expect(data).toBeNull(); // owner-only SELECT: zero rows, address never leaves the row
	});

	it('does not let a member create settings for another member (INSERT WITH CHECK)', async () => {
		const { error } = await marco
			.from('notification_settings')
			.insert({ user_id: TEST_USERS.lisa.id, email: 'hijack@test.invalid' });
		expect(error).not.toBeNull(); // RLS WITH CHECK rejects the row outright

		expect((await adminRead(TEST_USERS.lisa.id))?.email).toBe(LISA_ADDR);
	});

	it("does not let a member change another member's settings (UPDATE owner scope)", async () => {
		const { data } = await marco
			.from('notification_settings')
			.update({ email: 'hijack@test.invalid', meeting_cancelled: false })
			.eq('user_id', TEST_USERS.lisa.id)
			.select();
		expect(data).toEqual([]); // RLS USING clause matches zero rows

		expect(await adminRead(TEST_USERS.lisa.id)).toEqual({
			email: LISA_ADDR,
			invitation_received: true,
			invitation_answered: false,
			meeting_cancelled: true
		});
	});

	it("does not let a member delete another member's settings (no DELETE grant)", async () => {
		const { error } = await marco
			.from('notification_settings')
			.delete()
			.eq('user_id', TEST_USERS.lisa.id);
		expect(error).not.toBeNull(); // DELETE is not granted to authenticated at all

		expect((await adminRead(TEST_USERS.lisa.id))?.email).toBe(LISA_ADDR);
	});

	it('clearing the address opts the member out while keeping their flags', async () => {
		const { error } = await lisa
			.from('notification_settings')
			.update({ email: null })
			.eq('user_id', TEST_USERS.lisa.id);
		expect(error, error?.message).toBeNull();

		expect(await adminRead(TEST_USERS.lisa.id)).toEqual({
			email: null,
			invitation_received: true,
			invitation_answered: false,
			meeting_cancelled: true
		});
	});
});
