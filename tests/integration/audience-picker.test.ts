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

const TEST_SCOPE = 'audience-picker-test';
const SCOPE_DISPLAY_NAME = 'Audience picker test corner';

async function cleanScopedRows(admin: SupabaseClient): Promise<void> {
	await admin.from('prompts').update({ audience_scope: null }).eq('audience_scope', TEST_SCOPE);
	await admin.from('identity_scopes').delete().eq('scope', TEST_SCOPE);
	await admin.from('scopes').delete().eq('scope', TEST_SCOPE);
}

describe('Audience picker + label (Unit 6/7)', () => {
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
			name: SCOPE_DISPLAY_NAME,
			description: 'Used to test the audience picker and label.'
		}).throwOnError();

		// digit is the grantee (also the author of the scoped prompt). marco is non-grantee.
		await adminClient.from('identity_scopes').insert({
			identity_id: SEED_USERS.digit.id,
			scope: TEST_SCOPE
		}).throwOnError();

		granteeClient = await createAuthenticatedClient(SEED_USERS.digit.email, SEED_USERS.digit.password);
		granteeServices = createServices(granteeClient);
		nonGranteeClient = await createAuthenticatedClient(SEED_USERS.other.email, SEED_USERS.other.password);
		nonGranteeServices = createServices(nonGranteeClient);

		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
		const stubLocation = {
			place_id: 'test-place',
			name: 'Test venue',
			address: 'Test address',
			lat: 52.5,
			lng: 13.4
		};

		scopedPromptId = `aud-pick-scoped-${Date.now()}`;
		commonsPromptId = `aud-pick-commons-${Date.now()}`;

		await adminClient.from('prompts').insert({
			id: scopedPromptId,
			author_id: SEED_USERS.digit.id,
			title: 'Scoped picker test',
			state: 'published',
			region: 'berlin',
			audience_scope: TEST_SCOPE,
			published_at: new Date().toISOString()
		}).throwOnError();

		await adminClient.from('prompts').insert({
			id: commonsPromptId,
			author_id: SEED_USERS.digit.id,
			title: 'Commons picker test',
			state: 'published',
			region: 'berlin',
			audience_scope: null,
			published_at: new Date().toISOString()
		}).throwOnError();

		const { data: ss } = await adminClient.from('time_slots').insert({
			prompt_id: scopedPromptId,
			start_time: tomorrow,
			duration_minutes: 60,
			exact_location: stubLocation,
			general_area: 'Kreuzberg',
			accepted: false
		}).select('id').single();
		scopedSlotId = ss!.id;

		const { data: cs } = await adminClient.from('time_slots').insert({
			prompt_id: commonsPromptId,
			start_time: tomorrow,
			duration_minutes: 60,
			exact_location: stubLocation,
			general_area: 'Mitte',
			accepted: false
		}).select('id').single();
		commonsSlotId = cs!.id;
	});

	afterAll(async () => {
		await adminClient.from('time_slots').delete().in('id', [scopedSlotId, commonsSlotId]);
		await adminClient.from('prompts').delete().in('id', [scopedPromptId, commonsPromptId]);
		await cleanScopedRows(adminClient);
	});

	describe('ScopeService.listMyScopes', () => {
		it('grantee receives scope + name pairs for active grants', async () => {
			const result = await granteeServices.scope.listMyScopes(SEED_USERS.digit.id);
			const found = result.find((m) => m.scope === TEST_SCOPE);
			expect(found).toBeDefined();
			expect(found?.name).toBe(SCOPE_DISPLAY_NAME);
		});

		it('non-grantee receives empty array', async () => {
			const result = await nonGranteeServices.scope.listMyScopes(SEED_USERS.other.id);
			expect(result.find((m) => m.scope === TEST_SCOPE)).toBeUndefined();
		});

		it('grantee with revoked grant does not see the scope', async () => {
			// Revoke digit's grant temporarily.
			await adminClient
				.from('identity_scopes')
				.update({ revoked_at: new Date().toISOString() })
				.eq('identity_id', SEED_USERS.digit.id)
				.eq('scope', TEST_SCOPE);

			const result = await granteeServices.scope.listMyScopes(SEED_USERS.digit.id);
			expect(result.find((m) => m.scope === TEST_SCOPE)).toBeUndefined();

			// Restore for subsequent tests.
			await adminClient
				.from('identity_scopes')
				.update({ revoked_at: null })
				.eq('identity_id', SEED_USERS.digit.id)
				.eq('scope', TEST_SCOPE);
		});
	});

	describe('audience_scope_name on PromptSummary', () => {
		it('grantee discover feed: scoped prompts include audience_scope_name', async () => {
			const feed = await granteeServices.promptQuery.getPublishedPrompts({
				region: 'berlin',
				userId: SEED_USERS.digit.id,
				scopes: [TEST_SCOPE]
			});
			const scoped = feed.find((p) => p.id === scopedPromptId);
			expect(scoped?.audience_scope).toBe(TEST_SCOPE);
			expect(scoped?.audience_scope_name).toBe(SCOPE_DISPLAY_NAME);
		});

		it('grantee discover feed: commons prompts have audience_scope_name = null', async () => {
			const feed = await granteeServices.promptQuery.getPublishedPrompts({
				region: 'berlin',
				userId: SEED_USERS.digit.id,
				scopes: [TEST_SCOPE]
			});
			const commons = feed.find((p) => p.id === commonsPromptId);
			expect(commons?.audience_scope).toBeNull();
			expect(commons?.audience_scope_name).toBeNull();
		});

		it('non-grantee discover feed: scoped prompt does not appear (RLS)', async () => {
			const feed = await nonGranteeServices.promptQuery.getPublishedPrompts({
				region: 'berlin',
				userId: SEED_USERS.other.id,
				scopes: []
			});
			expect(feed.find((p) => p.id === scopedPromptId)).toBeUndefined();
		});

		it('grantee getPromptDetail: returns audience_scope_name', async () => {
			const detail = await granteeServices.promptQuery.getPromptDetail(
				scopedPromptId,
				SEED_USERS.digit.id
			);
			expect(detail?.audience_scope).toBe(TEST_SCOPE);
			expect(detail?.audience_scope_name).toBe(SCOPE_DISPLAY_NAME);
		});
	});

	describe('publish flow honors audience_scope', () => {
		it('persists audience_scope when grantee publishes a draft into their corner', async () => {
			const draftId = `aud-pick-publish-${Date.now()}`;
			await adminClient.from('prompts').insert({
				id: draftId,
				author_id: SEED_USERS.digit.id,
				title: 'Publish-flow draft',
				state: 'draft',
				region: 'berlin',
				cover_image_url: 'https://picsum.photos/seed/test/800/400'
			}).throwOnError();

			const tomorrow = new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString();
			await granteeServices.promptCommand.publish(
				draftId,
				SEED_USERS.digit.id,
				[
					{
						start_time: tomorrow,
						duration_minutes: 60,
						location: {
							place_id: 'pub-place',
							name: 'Test pub',
							address: 'Test addr',
							lat: 52.5,
							lng: 13.4
						}
					}
				],
				TEST_SCOPE
			);

			const { data: row } = await adminClient
				.from('prompts')
				.select('audience_scope, state')
				.eq('id', draftId)
				.single();
			expect(row?.audience_scope).toBe(TEST_SCOPE);
			expect(row?.state).toBe('published');

			// Cleanup
			await adminClient.from('time_slots').delete().eq('prompt_id', draftId);
			await adminClient.from('prompts').delete().eq('id', draftId);
		});

		it('publishing with no audience_scope keeps it NULL (Berlin commons)', async () => {
			const draftId = `aud-pick-commons-pub-${Date.now()}`;
			await adminClient.from('prompts').insert({
				id: draftId,
				author_id: SEED_USERS.digit.id,
				title: 'Commons publish-flow draft',
				state: 'draft',
				region: 'berlin',
				cover_image_url: 'https://picsum.photos/seed/test/800/400'
			}).throwOnError();

			const tomorrow = new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString();
			await granteeServices.promptCommand.publish(draftId, SEED_USERS.digit.id, [
				{
					start_time: tomorrow,
					duration_minutes: 60,
					location: {
						place_id: 'pub2',
						name: 'Test pub 2',
						address: 'addr 2',
						lat: 52.5,
						lng: 13.4
					}
				}
			]);

			const { data: row } = await adminClient
				.from('prompts')
				.select('audience_scope, state')
				.eq('id', draftId)
				.single();
			expect(row?.audience_scope).toBeNull();
			expect(row?.state).toBe('published');

			await adminClient.from('time_slots').delete().eq('prompt_id', draftId);
			await adminClient.from('prompts').delete().eq('id', draftId);
		});
	});
});
