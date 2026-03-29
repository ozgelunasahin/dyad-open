import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuthenticatedClient, SEED_USERS, SEED_PROMPTS } from '../helpers/auth.js';
import { createServices, type Services } from '../helpers/db.js';
import { cleanTestData } from '../helpers/cleanup.js';
import type { TimeSlotInput } from '../../src/lib/domain/types.js';

describe('Prompt lifecycle', () => {
	let digitClient: SupabaseClient;
	let digitServices: Services;
	let otherClient: SupabaseClient;
	let otherServices: Services;

	beforeAll(async () => {
		digitClient = await createAuthenticatedClient(
			SEED_USERS.digit.email,
			SEED_USERS.digit.password
		);
		digitServices = createServices(digitClient);

		otherClient = await createAuthenticatedClient(
			SEED_USERS.other.email,
			SEED_USERS.other.password
		);
		otherServices = createServices(otherClient);
	});

	describe('getMyPrompts', () => {
		it("returns the user's own prompts", async () => {
			const prompts = await digitServices.promptQuery.getMyPrompts(SEED_USERS.digit.id);
			expect(prompts.length).toBeGreaterThanOrEqual(2); // seed has published + draft
			expect(prompts.every((p) => p.author_id === SEED_USERS.digit.id)).toBe(true);
		});

		it("does not return other users' prompts", async () => {
			const prompts = await digitServices.promptQuery.getMyPrompts(SEED_USERS.digit.id);
			expect(prompts.every((p) => p.author_id !== SEED_USERS.other.id)).toBe(true);
		});
	});

	describe('create → publish → query → unpublish', () => {
		let createdPromptId: string;

		it('creates a draft prompt', async () => {
			const prompt = await digitServices.promptCommand.create(SEED_USERS.digit.id, {
				title: 'Integration test prompt',
				body: {
					type: 'doc',
					content: [
						{
							type: 'paragraph',
							content: [{ type: 'text', text: 'This is a test prompt body.' }]
						}
					]
				}
			});

			expect(prompt.id).toBeTruthy();
			expect(prompt.state).toBe('draft');
			expect(prompt.title).toBe('Integration test prompt');
			expect(prompt.author_id).toBe(SEED_USERS.digit.id);
			createdPromptId = prompt.id;
		});

		it('publishes with time slots', async () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);

			const slots: TimeSlotInput[] = [
				{
					start_time: tomorrow.toISOString(),
					duration_minutes: 60,
					location: {
						place_id: 'test-1',
						name: 'Test Café',
						address: 'Teststraße 1, 10999 Berlin',
						lat: 52.4988,
						lng: 13.4238
					}
				}
			];

			await digitServices.promptCommand.publish(createdPromptId, SEED_USERS.digit.id, slots);

			// Verify state changed
			const prompts = await digitServices.promptQuery.getMyPrompts(SEED_USERS.digit.id);
			const published = prompts.find((p) => p.id === createdPromptId);
			expect(published?.state).toBe('published');
			expect(published?.published_at).toBeTruthy();
		});

		it('appears in discover feed for other users', async () => {
			const feed = await otherServices.promptQuery.getPublishedPrompts({
				region: 'berlin',
				userId: SEED_USERS.other.id
			});

			const found = feed.find((p) => p.id === createdPromptId);
			expect(found).toBeTruthy();
			expect(found?.title).toBe('Integration test prompt');
			expect(found?.available_slots.length).toBe(1);
		});

		it('appears in discover feed for the author (own conversations visible)', async () => {
			const feed = await digitServices.promptQuery.getPublishedPrompts({
				region: 'berlin',
				userId: SEED_USERS.digit.id
			});

			const found = feed.find((p) => p.id === createdPromptId);
			expect(found).toBeTruthy();
		});

		it('unpublishes to archived', async () => {
			await digitServices.promptCommand.unpublish(createdPromptId, SEED_USERS.digit.id);

			const prompts = await digitServices.promptQuery.getMyPrompts(SEED_USERS.digit.id);
			const archived = prompts.find((p) => p.id === createdPromptId);
			expect(archived?.state).toBe('archived');
		});

		it('republishes with new slots', async () => {
			const dayAfterTomorrow = new Date();
			dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

			await digitServices.promptCommand.republish(createdPromptId, SEED_USERS.digit.id, [
				{
					start_time: dayAfterTomorrow.toISOString(),
					duration_minutes: 90,
					location: {
						place_id: 'test-2',
						name: 'Another Place',
						address: 'Andere Straße 5, 10999 Berlin',
						lat: 52.5,
						lng: 13.43
					}
				}
			]);

			const prompts = await digitServices.promptQuery.getMyPrompts(SEED_USERS.digit.id);
			const republished = prompts.find((p) => p.id === createdPromptId);
			expect(republished?.state).toBe('published');
		});

		it('cleans up — delete after unpublishing', async () => {
			await digitServices.promptCommand.unpublish(createdPromptId, SEED_USERS.digit.id);
			// Can only delete drafts, so this should fail on archived
			await expect(
				digitServices.promptCommand.deleteDraft(createdPromptId, SEED_USERS.digit.id)
			).rejects.toThrow('Can only delete drafts');
		});
	});

	describe('RLS enforcement via services', () => {
		it("other user cannot update digit's prompt", async () => {
			await expect(
				otherServices.promptCommand.update(SEED_PROMPTS.draft, SEED_USERS.other.id, {
					title: 'Hacked!'
				})
			).rejects.toThrow();
		});

		it("other user cannot delete digit's draft", async () => {
			await expect(
				otherServices.promptCommand.deleteDraft(SEED_PROMPTS.draft, SEED_USERS.other.id)
			).rejects.toThrow();
		});

		it('other user can read published prompts via discover', async () => {
			const feed = await otherServices.promptQuery.getPublishedPrompts({
				region: 'berlin',
				userId: SEED_USERS.other.id
			});
			// Should see digit's published prompt from seed
			const found = feed.find((p) => p.id === SEED_PROMPTS.published);
			expect(found).toBeTruthy();
		});

		it('prompt detail hides exact_location', async () => {
			const detail = await otherServices.promptQuery.getPromptDetail(
				SEED_PROMPTS.published,
				SEED_USERS.other.id
			);
			expect(detail).toBeTruthy();
			// Available slots should not contain exact_location
			for (const slot of detail!.available_slots) {
				expect((slot as unknown as Record<string, unknown>).exact_location).toBeUndefined();
			}
		});
	});

	afterAll(() => cleanTestData());
});
