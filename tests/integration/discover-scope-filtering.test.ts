import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	SEED_USERS,
	TEST_USERS
} from '../helpers/auth.js';
import { createServices, type Services } from '../helpers/db.js';
import { cleanTestData } from '../helpers/cleanup.js';

const TEST_SCOPE = 'discover-filter-test';

async function cleanScopedRows(admin: SupabaseClient): Promise<void> {
	await admin.from('prompts').update({ audience_scope: null }).eq('audience_scope', TEST_SCOPE);
	await admin.from('identity_scopes').delete().eq('scope', TEST_SCOPE);
	await admin.from('scopes').delete().eq('scope', TEST_SCOPE);
}

describe('Discover scope filtering (Unit 3)', () => {
	let adminClient: SupabaseClient;
	let granteeClient: SupabaseClient;
	let granteeServices: Services;
	let nonGranteeClient: SupabaseClient;
	let nonGranteeServices: Services;

	let scopedPromptId: string;
	let commonsPromptId: string;
	let scopedSlotId: string;
	let commonsSlotId: string;

	beforeAll(async () => {
		adminClient = createAdminClient();
		await cleanScopedRows(adminClient);
		await cleanTestData(adminClient);

		await adminClient.from('scopes').insert({
			scope: TEST_SCOPE,
			name: 'Discover filter test corner',
			description: 'Used to test the discover scope filter.',
			created_by: TEST_USERS.lisa.id
		});
		await adminClient.from('identity_scopes').insert({
			identity_id: SEED_USERS.digit.id, // grantee
			scope: TEST_SCOPE,
			granted_by: TEST_USERS.lisa.id
		});
		await adminClient.from('identity_scopes').insert({
			identity_id: TEST_USERS.ava.id, // author
			scope: TEST_SCOPE,
			granted_by: TEST_USERS.lisa.id
		});

		granteeClient = await createAuthenticatedClient(
			SEED_USERS.digit.email,
			SEED_USERS.digit.password
		);
		granteeServices = createServices(granteeClient);
		nonGranteeClient = await createAuthenticatedClient(
			SEED_USERS.other.email,
			SEED_USERS.other.password
		);
		nonGranteeServices = createServices(nonGranteeClient);

		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
		const stubLocation = {
			place_id: 'test-place',
			name: 'Test venue',
			address: 'Test address',
			lat: 52.5,
			lng: 13.4
		};

		scopedPromptId = `disc-filter-scoped-${Date.now()}`;
		commonsPromptId = `disc-filter-commons-${Date.now()}`;

		await adminClient.from('prompts').insert({
			id: scopedPromptId,
			author_id: TEST_USERS.ava.id,
			title: 'Scoped discover prompt',
			state: 'published',
			region: 'berlin',
			audience_scope: TEST_SCOPE,
			published_at: new Date().toISOString()
		}).throwOnError();

		await adminClient.from('prompts').insert({
			id: commonsPromptId,
			author_id: TEST_USERS.ava.id,
			title: 'Commons discover prompt',
			state: 'published',
			region: 'berlin',
			audience_scope: null,
			published_at: new Date().toISOString()
		}).throwOnError();

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
		await adminClient.from('time_slots').delete().in('id', [scopedSlotId, commonsSlotId]);
		await adminClient.from('prompts').delete().in('id', [scopedPromptId, commonsPromptId]);
		await cleanScopedRows(adminClient);
	});

	describe('getPublishedPrompts (authenticated discover)', () => {
		it('grantee sees both commons and their scoped prompt', async () => {
			const feed = await granteeServices.promptQuery.getPublishedPrompts({
				region: 'berlin',
				userId: SEED_USERS.digit.id,
				scopes: [TEST_SCOPE]
			});
			const ids = feed.map((p) => p.id);
			expect(ids).toContain(commonsPromptId);
			expect(ids).toContain(scopedPromptId);
		});

		it('non-grantee sees commons but NOT the scoped prompt', async () => {
			const feed = await nonGranteeServices.promptQuery.getPublishedPrompts({
				region: 'berlin',
				userId: SEED_USERS.other.id,
				scopes: []
			});
			const ids = feed.map((p) => p.id);
			expect(ids).toContain(commonsPromptId);
			expect(ids).not.toContain(scopedPromptId);
		});

		it('caller passing empty scopes sees commons-only (revoked grant treated as no-grant)', async () => {
			// Even if the same client could otherwise see the scope, with scopes=[]
			// the application-layer filter excludes scoped prompts.
			const feed = await granteeServices.promptQuery.getPublishedPrompts({
				region: 'berlin',
				userId: SEED_USERS.digit.id,
				scopes: []
			});
			const ids = feed.map((p) => p.id);
			expect(ids).toContain(commonsPromptId);
			expect(ids).not.toContain(scopedPromptId);
		});

		it('audience_scope is populated on PromptSummary for scoped prompts', async () => {
			const feed = await granteeServices.promptQuery.getPublishedPrompts({
				region: 'berlin',
				userId: SEED_USERS.digit.id,
				scopes: [TEST_SCOPE]
			});
			const scoped = feed.find((p) => p.id === scopedPromptId);
			const commons = feed.find((p) => p.id === commonsPromptId);
			expect(scoped?.audience_scope).toBe(TEST_SCOPE);
			expect(commons?.audience_scope).toBeNull();
		});
	});

	describe('getSearchCorpus', () => {
		it('grantee search corpus includes the scoped prompt', async () => {
			const corpus = await granteeServices.promptQuery.getSearchCorpus('berlin', [TEST_SCOPE]);
			const ids = corpus.map((c) => c.id);
			expect(ids).toContain(scopedPromptId);
			expect(ids).toContain(commonsPromptId);
		});

		it('non-grantee search corpus excludes the scoped prompt', async () => {
			const corpus = await nonGranteeServices.promptQuery.getSearchCorpus('berlin', []);
			const ids = corpus.map((c) => c.id);
			expect(ids).toContain(commonsPromptId);
			expect(ids).not.toContain(scopedPromptId);
		});
	});

	describe('getPublicProfile', () => {
		it('grantee viewing the author profile sees both prompts', async () => {
			const profile = await granteeServices.promptQuery.getPublicProfile(
				TEST_USERS.ava.username,
				[TEST_SCOPE]
			);
			const ids = (profile?.prompts ?? []).map((p) => p.id);
			expect(ids).toContain(commonsPromptId);
			expect(ids).toContain(scopedPromptId);
		});

		it('non-grantee viewing the author profile sees only commons prompt', async () => {
			const profile = await nonGranteeServices.promptQuery.getPublicProfile(
				TEST_USERS.ava.username,
				[]
			);
			const ids = (profile?.prompts ?? []).map((p) => p.id);
			expect(ids).toContain(commonsPromptId);
			expect(ids).not.toContain(scopedPromptId);
		});
	});

	describe('getPromptDetail (R8 closed: scope-gated at RLS)', () => {
		// Migration 20260508180200 closed R8: authenticated SELECT on prompts now
		// requires scope membership for non-NULL audience_scope. getPromptDetail
		// returns null when the caller is a non-grantee — the bounded-safety
		// promise is now detail-bounded, not just listing-bounded.
		it('non-grantee gets null when fetching scoped prompt detail', async () => {
			const detail = await nonGranteeServices.promptQuery.getPromptDetail(
				scopedPromptId,
				SEED_USERS.other.id
			);
			expect(detail).toBeNull();
		});

		it('grantee can fetch the scoped prompt detail with audience_scope populated', async () => {
			const detail = await granteeServices.promptQuery.getPromptDetail(
				scopedPromptId,
				SEED_USERS.digit.id
			);
			expect(detail?.id).toBe(scopedPromptId);
			expect(detail?.audience_scope).toBe(TEST_SCOPE);
		});
	});
});
