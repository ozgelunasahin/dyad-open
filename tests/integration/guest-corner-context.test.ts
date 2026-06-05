import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createAuthenticatedClient,
	createAdminClient,
	SEED_USERS,
	TEST_USERS
} from '../helpers/auth.js';
import { createServices, type Services } from '../helpers/db.js';

const TEST_SCOPE = 'guest-ctx-corner';

async function cleanRows(admin: SupabaseClient): Promise<void> {
	await admin
		.from('profiles')
		.update({ access_expires_at: null, home_scope: null })
		.eq('id', SEED_USERS.other.id);
	await admin.from('prompts').delete().like('id', 'guest-ctx-%');
	await admin.from('identity_scopes').delete().eq('scope', TEST_SCOPE);
	await admin.from('scopes').delete().eq('scope', TEST_SCOPE);
}

describe('Guest corner context (U3)', () => {
	let admin: SupabaseClient;
	let guestServices: Services; // marco — guest, home_scope = TEST_SCOPE
	let memberServices: Services; // lisa — commons member holding the corner grant
	let createdPromptIds: string[] = [];

	const CORNER_PROMPT = 'guest-ctx-corner-prompt';
	const COMMONS_BERLIN = 'guest-ctx-commons-berlin';
	const COMMONS_AMSTERDAM = 'guest-ctx-commons-amsterdam';

	beforeAll(async () => {
		admin = createAdminClient();
		await cleanRows(admin);

		await admin.from('scopes').insert({
			scope: TEST_SCOPE,
			name: 'Guest context corner',
			description: 'Used by guest-corner-context tests.',
			created_by: TEST_USERS.lisa.id,
			region: 'amsterdam'
		});
		// ava authors all prompts and holds the corner grant.
		await admin.from('identity_scopes').insert([
			{ identity_id: TEST_USERS.ava.id, scope: TEST_SCOPE, granted_by: null },
			{ identity_id: SEED_USERS.digit.id, scope: TEST_SCOPE, granted_by: null },
			{ identity_id: SEED_USERS.other.id, scope: TEST_SCOPE, granted_by: null }
		]);
		// marco is the guest: corner-exclusive context.
		await admin
			.from('profiles')
			.update({
				access_expires_at: new Date(Date.now() + 48 * 3600_000).toISOString(),
				home_scope: TEST_SCOPE
			})
			.eq('id', SEED_USERS.other.id);

		const tomorrow = new Date(Date.now() + 24 * 3600_000).toISOString();
		const amsterdamLocation = {
			place_id: 'test-place-ams',
			name: 'De Ceuvel',
			address: 'Korte Papaverweg 4, Amsterdam',
			lat: 52.384,
			lng: 4.906
		};
		const berlinLocation = {
			place_id: 'test-place-ber',
			name: 'Test venue',
			address: 'Test address, Berlin',
			lat: 52.5,
			lng: 13.4
		};

		await admin.from('prompts').insert([
			{
				id: CORNER_PROMPT,
				author_id: TEST_USERS.ava.id,
				title: 'Corner conversation (Amsterdam)',
				state: 'published',
				region: 'amsterdam',
				audience_scope: TEST_SCOPE,
				published_at: new Date().toISOString()
			},
			{
				id: COMMONS_BERLIN,
				author_id: TEST_USERS.ava.id,
				title: 'Commons conversation (Berlin)',
				state: 'published',
				region: 'berlin',
				audience_scope: null,
				published_at: new Date().toISOString()
			},
			{
				// Same region as the guest's corner but NOT in the corner — proves
				// the audience filter (not just the region filter) excludes it.
				id: COMMONS_AMSTERDAM,
				author_id: TEST_USERS.ava.id,
				title: 'Commons conversation (Amsterdam)',
				state: 'published',
				region: 'amsterdam',
				audience_scope: null,
				published_at: new Date().toISOString()
			}
		]).throwOnError();

		await admin.from('time_slots').insert([
			{
				prompt_id: CORNER_PROMPT,
				start_time: tomorrow,
				duration_minutes: 60,
				exact_location: amsterdamLocation,
				general_area: 'Amsterdam-Noord',
				accepted: false
			},
			{
				prompt_id: COMMONS_BERLIN,
				start_time: tomorrow,
				duration_minutes: 60,
				exact_location: berlinLocation,
				general_area: 'Mitte',
				accepted: false
			},
			{
				prompt_id: COMMONS_AMSTERDAM,
				start_time: tomorrow,
				duration_minutes: 60,
				exact_location: amsterdamLocation,
				general_area: 'Jordaan',
				accepted: false
			}
		]).throwOnError();

		const guestClient = await createAuthenticatedClient(
			SEED_USERS.other.email,
			SEED_USERS.other.password
		);
		guestServices = createServices(guestClient);
		const memberClient = await createAuthenticatedClient(
			SEED_USERS.digit.email,
			SEED_USERS.digit.password
		);
		memberServices = createServices(memberClient);
	});

	afterAll(async () => {
		if (createdPromptIds.length > 0) {
			await admin.from('time_slots').delete().in('prompt_id', createdPromptIds);
			await admin.from('prompts').delete().in('id', createdPromptIds);
		}
		await admin
			.from('time_slots')
			.delete()
			.in('prompt_id', [CORNER_PROMPT, COMMONS_BERLIN, COMMONS_AMSTERDAM]);
		await cleanRows(admin);
	});

	describe('getPublishedPrompts — corner-exclusive feed', () => {
		it('guest sees only corner prompts (commons suppressed even in the same region)', async () => {
			const feed = await guestServices.promptQuery.getPublishedPrompts({
				region: 'amsterdam',
				userId: SEED_USERS.other.id,
				scopes: [TEST_SCOPE],
				homeScope: TEST_SCOPE
			});
			const ids = feed.map((p) => p.id);
			expect(ids).toContain(CORNER_PROMPT);
			expect(ids).not.toContain(COMMONS_AMSTERDAM);
			expect(ids).not.toContain(COMMONS_BERLIN);
		});

		it('commons member with the same grant keeps the union view (unchanged)', async () => {
			const amsterdamFeed = await memberServices.promptQuery.getPublishedPrompts({
				region: 'amsterdam',
				userId: SEED_USERS.digit.id,
				scopes: [TEST_SCOPE]
			});
			const ids = amsterdamFeed.map((p) => p.id);
			expect(ids).toContain(CORNER_PROMPT);
			expect(ids).toContain(COMMONS_AMSTERDAM);

			const berlinFeed = await memberServices.promptQuery.getPublishedPrompts({
				region: 'berlin',
				userId: SEED_USERS.digit.id,
				scopes: [TEST_SCOPE]
			});
			expect(berlinFeed.map((p) => p.id)).toContain(COMMONS_BERLIN);
		});

		it('non-grantee never sees corner prompts (regression guard)', async () => {
			const feed = await memberServices.promptQuery.getPublishedPrompts({
				region: 'amsterdam',
				userId: SEED_USERS.digit.id,
				scopes: []
			});
			const ids = feed.map((p) => p.id);
			expect(ids).toContain(COMMONS_AMSTERDAM);
			expect(ids).not.toContain(CORNER_PROMPT);
		});
	});

	describe('getSearchCorpus — corner-exclusive', () => {
		it('guest corpus contains only corner prompts', async () => {
			const corpus = await guestServices.promptQuery.getSearchCorpus(
				'amsterdam',
				[TEST_SCOPE],
				TEST_SCOPE
			);
			const ids = corpus.map((c) => c.id);
			expect(ids).toContain(CORNER_PROMPT);
			expect(ids).not.toContain(COMMONS_AMSTERDAM);
		});
	});

	describe('getPublicProfile — corner-exclusive', () => {
		it('guest viewing an author profile sees only that author\'s corner prompts', async () => {
			const profile = await guestServices.promptQuery.getPublicProfile(
				TEST_USERS.ava.username,
				[TEST_SCOPE],
				TEST_SCOPE
			);
			const ids = (profile?.prompts ?? []).map((p) => p.id);
			expect(ids).toContain(CORNER_PROMPT);
			expect(ids).not.toContain(COMMONS_BERLIN);
			expect(ids).not.toContain(COMMONS_AMSTERDAM);
		});
	});

	describe('publish — corner region stamping', () => {
		it('a member publishing into a region\'d corner gets the corner\'s region (and venue validation)', async () => {
			// lisa is a commons member (no home_scope) holding the Amsterdam
			// corner grant — the operator-seeding scenario. Her draft defaults
			// to berlin; publishing into the corner must stamp amsterdam, or
			// the corner's guests (whose feed filters region=amsterdam) never
			// see the conversation.
			const draft = await memberServices.promptCommand.create(SEED_USERS.digit.id, {
				title: 'Seeded corner conversation',
				coverImageUrl: 'https://picsum.photos/seed/corner/800/400'
			});
			createdPromptIds.push(draft.id);
			expect(draft.region).toBe('berlin');

			const futureSlot = {
				start_time: new Date(Date.now() + 72 * 3600_000).toISOString(),
				duration_minutes: 60,
				location: {
					place_id: 'seed-ams-venue',
					name: 'Tolhuistuin',
					address: 'IJpromenade 2, Amsterdam',
					lat: 52.384,
					lng: 4.903
				}
			};
			await memberServices.promptCommand.publish(
				draft.id,
				SEED_USERS.digit.id,
				[futureSlot],
				TEST_SCOPE,
				1
			);

			const { data: row } = await admin
				.from('prompts')
				.select('region, audience_scope')
				.eq('id', draft.id)
				.single();
			expect(row?.region).toBe('amsterdam');
			expect(row?.audience_scope).toBe(TEST_SCOPE);

			// And the guest's corner-exclusive amsterdam feed now contains it.
			const feed = await guestServices.promptQuery.getPublishedPrompts({
				region: 'amsterdam',
				userId: SEED_USERS.other.id,
				scopes: [TEST_SCOPE],
				homeScope: TEST_SCOPE
			});
			expect(feed.map((p) => p.id)).toContain(draft.id);
		});

		it('a Berlin venue is rejected when publishing into the Amsterdam corner', async () => {
			const draft = await memberServices.promptCommand.create(SEED_USERS.digit.id, {
				title: 'Wrong-city venue',
				coverImageUrl: 'https://picsum.photos/seed/wrong/800/400'
			});
			createdPromptIds.push(draft.id);

			const berlinSlot = {
				start_time: new Date(Date.now() + 72 * 3600_000).toISOString(),
				duration_minutes: 60,
				location: {
					place_id: 'seed-ber-venue',
					name: 'Test venue',
					address: 'Teststr 1, Berlin',
					lat: 52.5,
					lng: 13.4
				}
			};
			await expect(
				memberServices.promptCommand.publish(
					draft.id,
					SEED_USERS.digit.id,
					[berlinSlot],
					TEST_SCOPE,
					1
				)
			).rejects.toThrow('outside Amsterdam');
		});
	});

	describe('create — explicit region stamping', () => {
		it('a guest draft carries the corner region', async () => {
			const prompt = await guestServices.promptCommand.create(SEED_USERS.other.id, {
				title: 'Guest draft',
				region: 'amsterdam'
			});
			createdPromptIds.push(prompt.id);
			expect(prompt.region).toBe('amsterdam');
		});

		it('a commons draft defaults to berlin', async () => {
			const prompt = await memberServices.promptCommand.create(SEED_USERS.digit.id, {
				title: 'Commons draft'
			});
			createdPromptIds.push(prompt.id);
			expect(prompt.region).toBe('berlin');
		});
	});
});
