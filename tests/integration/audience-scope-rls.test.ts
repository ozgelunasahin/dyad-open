import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	SEED_USERS,
	TEST_USERS
} from '../helpers/auth.js';
import { cleanTestData } from '../helpers/cleanup.js';

const TEST_SCOPE = 'audience-rls-test';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY ?? '';

function createAnonClient(): SupabaseClient {
	return createClient(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

async function cleanScopedRows(admin: SupabaseClient): Promise<void> {
	// Drop test prompts that reference TEST_SCOPE so we can drop the scope.
	await admin.from('prompts').update({ audience_scope: null }).eq('audience_scope', TEST_SCOPE);
	await admin.from('identity_scopes').delete().eq('scope', TEST_SCOPE);
	await admin.from('scopes').delete().eq('scope', TEST_SCOPE);
}

describe('Audience scope RLS (Unit 2)', () => {
	let adminClient: SupabaseClient;
	let granteeClient: SupabaseClient;
	let nonGranteeClient: SupabaseClient;
	let anonClient: SupabaseClient;

	let scopedPromptId: string;
	let commonsPromptId: string;
	let scopedSlotId: string;
	let commonsSlotId: string;

	beforeAll(async () => {
		adminClient = createAdminClient();
		await cleanScopedRows(adminClient);
		await cleanTestData(adminClient);

		// SEED_USERS.digit (lisa) is the grantee. SEED_USERS.other (marco) is non-grantee.
		// TEST_USERS.ava is the author of the scoped prompt.
		await adminClient.from('scopes').insert({
			scope: TEST_SCOPE,
			name: 'Audience RLS test corner',
			description: 'Used to test audience_scope visibility.',
			created_by: TEST_USERS.lisa.id
		});
		await adminClient.from('identity_scopes').insert({
			identity_id: SEED_USERS.digit.id,
			scope: TEST_SCOPE,
			granted_by: TEST_USERS.lisa.id
		});
		// Author also needs a grant in order to write to that scope.
		await adminClient.from('identity_scopes').insert({
			identity_id: TEST_USERS.ava.id,
			scope: TEST_SCOPE,
			granted_by: TEST_USERS.lisa.id
		});

		granteeClient = await createAuthenticatedClient(
			SEED_USERS.digit.email,
			SEED_USERS.digit.password
		);
		nonGranteeClient = await createAuthenticatedClient(
			SEED_USERS.other.email,
			SEED_USERS.other.password
		);
		anonClient = createAnonClient();

		// Insert one scoped published prompt and one commons published prompt
		// with slots, both authored by ava (a grantee), via service-role to skip
		// the publish state machine. Real publish goes through prompt-command.
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

		// prompts.id is TEXT (nanoid in app layer); generate test-specific IDs.
		scopedPromptId = `aud-rls-scoped-${Date.now()}`;
		commonsPromptId = `aud-rls-commons-${Date.now()}`;

		await adminClient.from('prompts').insert({
			id: scopedPromptId,
			author_id: TEST_USERS.ava.id,
			title: 'Scoped prompt',
			state: 'published',
			region: 'berlin',
			audience_scope: TEST_SCOPE,
			published_at: new Date().toISOString()
		}).throwOnError();

		await adminClient.from('prompts').insert({
			id: commonsPromptId,
			author_id: TEST_USERS.ava.id,
			title: 'Commons prompt',
			state: 'published',
			region: 'berlin',
			audience_scope: null,
			published_at: new Date().toISOString()
		}).throwOnError();

		const stubLocation = {
			place_id: 'test-place',
			name: 'Test venue',
			address: 'Test address',
			lat: 52.5,
			lng: 13.4
		};

		const { data: scopedSlot } = await adminClient.from('time_slots').insert({
			prompt_id: scopedPromptId,
			start_time: tomorrow,
			duration_minutes: 60,
			exact_location: stubLocation,
			general_area: 'Kreuzberg',
			accepted: false
		}).select('id').single();
		scopedSlotId = scopedSlot!.id;

		const { data: commonsSlot } = await adminClient.from('time_slots').insert({
			prompt_id: commonsPromptId,
			start_time: tomorrow,
			duration_minutes: 60,
			exact_location: stubLocation,
			general_area: 'Mitte',
			accepted: false
		}).select('id').single();
		commonsSlotId = commonsSlot!.id;
	});

	afterAll(async () => {
		// Order matters: drop slots, drop prompts, then drop scopes references.
		await adminClient.from('time_slots').delete().in('id', [scopedSlotId, commonsSlotId]);
		await adminClient.from('prompts').delete().in('id', [scopedPromptId, commonsPromptId]);
		await cleanScopedRows(adminClient);
	});

	describe('prompts RLS (anon)', () => {
		it('anon CAN SELECT a commons prompt', async () => {
			const { data } = await anonClient.from('prompts').select('id').eq('id', commonsPromptId).maybeSingle();
			expect(data?.id).toBe(commonsPromptId);
		});

		it('anon CANNOT SELECT a scoped prompt', async () => {
			const { data } = await anonClient.from('prompts').select('id').eq('id', scopedPromptId).maybeSingle();
			expect(data).toBeNull();
		});
	});

	describe('prompts RLS (authenticated, R8 closed)', () => {
		// Migration 20260508180200 closed the R8 gap: authenticated SELECT on
		// prompts now requires scope membership when audience_scope is non-NULL.
		// The bounded-safety promise is now detail-bounded, not just listing-bounded.
		// Authors continue to see their own work via the "Authors can manage own
		// prompts" FOR ALL policy.
		it('non-grantee authenticated user CANNOT SELECT a scoped prompt via direct UUID', async () => {
			const { data } = await nonGranteeClient.from('prompts').select('id').eq('id', scopedPromptId).maybeSingle();
			expect(data).toBeNull();
		});

		it('grantee authenticated user CAN SELECT the scoped prompt', async () => {
			const { data } = await granteeClient.from('prompts').select('id').eq('id', scopedPromptId).maybeSingle();
			expect(data?.id).toBe(scopedPromptId);
		});

		it('author CAN SELECT their own scoped prompt regardless of grant state', async () => {
			// ava is the author of the scoped prompt (set up in beforeAll). Even if
			// her grant were revoked, she'd still read her own prompt via the
			// "Authors can manage own prompts" FOR ALL policy.
			const avaClient = await createAuthenticatedClient(
				TEST_USERS.ava.email,
				TEST_USERS.ava.password
			);
			const { data } = await avaClient.from('prompts').select('id').eq('id', scopedPromptId).maybeSingle();
			expect(data?.id).toBe(scopedPromptId);
		});
	});

	describe('time_slots RLS (anon)', () => {
		it('anon CAN SELECT a slot of a commons prompt', async () => {
			const { data } = await anonClient.from('time_slots').select('id').eq('id', commonsSlotId).maybeSingle();
			expect(data?.id).toBe(commonsSlotId);
		});

		it('anon CANNOT SELECT a slot of a scoped prompt', async () => {
			const { data } = await anonClient.from('time_slots').select('id').eq('id', scopedSlotId).maybeSingle();
			expect(data).toBeNull();
		});
	});

	describe('time_slots RLS (authenticated)', () => {
		it('non-grantee CAN SELECT a slot of a commons prompt', async () => {
			const { data } = await nonGranteeClient.from('time_slots').select('id').eq('id', commonsSlotId).maybeSingle();
			expect(data?.id).toBe(commonsSlotId);
		});

		it('non-grantee CANNOT SELECT a slot of a scoped prompt', async () => {
			const { data } = await nonGranteeClient.from('time_slots').select('id').eq('id', scopedSlotId).maybeSingle();
			expect(data).toBeNull();
		});

		it('grantee CAN SELECT a slot of a scoped prompt', async () => {
			const { data } = await granteeClient.from('time_slots').select('id').eq('id', scopedSlotId).maybeSingle();
			expect(data?.id).toBe(scopedSlotId);
		});
	});

	describe('FK constraints', () => {
		it('INSERT into prompts with non-existent audience_scope fails', async () => {
			const { error } = await adminClient.from('prompts').insert({
				id: `aud-rls-bad-scope-${Date.now()}`,
				author_id: TEST_USERS.ava.id,
				title: 'Bad scope',
				state: 'draft',
				region: 'berlin',
				audience_scope: 'nonexistent-scope'
			});
			expect(error).not.toBeNull();
			expect(error?.code).toBe('23503');
		});

		it('INSERT into invitations with non-existent scope fails', async () => {
			const { error } = await adminClient.from('invitations').insert({
				email: 'nobody@test.invalid',
				token: 'should-fail',
				expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
				scope: 'nonexistent-scope'
			});
			expect(error).not.toBeNull();
			expect(error?.code).toBe('23503');
		});

		it('INSERT into invitations with valid scope succeeds and stores the FK', async () => {
			await adminClient.from('invitations').delete().eq('email', 'scoped-invite@test.invalid');
			const { error } = await adminClient.from('invitations').insert({
				email: 'scoped-invite@test.invalid',
				token: 'scoped-invite-token-' + Date.now(),
				expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
				scope: TEST_SCOPE
			});
			expect(error).toBeNull();
			// Cleanup
			await adminClient.from('invitations').delete().eq('email', 'scoped-invite@test.invalid');
		});
	});
});
