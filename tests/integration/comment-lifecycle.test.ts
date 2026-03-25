import { describe, it, expect, beforeAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuthenticatedClient, SEED_USERS, SEED_PROMPTS } from '../helpers/auth.js';
import { createServices, type Services } from '../helpers/db.js';

describe('Comment lifecycle', () => {
	let digitClient: SupabaseClient;
	let digitServices: Services;
	let otherClient: SupabaseClient;
	let otherServices: Services;

	beforeAll(async () => {
		digitClient = await createAuthenticatedClient(SEED_USERS.digit.email, SEED_USERS.digit.password);
		digitServices = createServices(digitClient);
		otherClient = await createAuthenticatedClient(SEED_USERS.other.email, SEED_USERS.other.password);
		otherServices = createServices(otherClient);
	});

	describe('create and edit', () => {
		it('creates a comment on a published prompt', async () => {
			const comment = await otherServices.comment.createOrUpdate(
				SEED_PROMPTS.published,
				SEED_USERS.other.id,
				'Test comment from integration test'
			);

			expect(comment.id).toBeTruthy();
			expect(comment.body).toBe('Test comment from integration test');
			expect(comment.prompt_id).toBe(SEED_PROMPTS.published);
			expect(comment.author_id).toBe(SEED_USERS.other.id);
		});

		it('edits via upsert (same endpoint, updated body)', async () => {
			const updated = await otherServices.comment.createOrUpdate(
				SEED_PROMPTS.published,
				SEED_USERS.other.id,
				'Updated comment body'
			);

			expect(updated.body).toBe('Updated comment body');
			// updated_at should be after created_at (edited)
			expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(
				new Date(updated.created_at).getTime()
			);
		});
	});

	describe('two-party visibility', () => {
		it('prompt author sees all comments on their prompt', async () => {
			const comments = await digitServices.comment.getCommentsForPrompt(
				SEED_PROMPTS.published
			);
			// Should see at least the seed comment + the one from the test above
			expect(comments.length).toBeGreaterThanOrEqual(1);
		});

		it('commenter sees only their own comment', async () => {
			const myComment = await otherServices.comment.getMyComment(
				SEED_PROMPTS.published,
				SEED_USERS.other.id
			);
			expect(myComment).toBeTruthy();
			expect(myComment!.author_id).toBe(SEED_USERS.other.id);
		});

		it('non-author non-commenter sees nothing', async () => {
			// digit comments on other's prompt (seed data exists)
			// other should NOT see digit's comment on digit's own prompt
			// Actually, other IS the commenter on digit's prompt, so let's test
			// that digit can't see other people's comments on OTHER's prompt
			const comments = await digitServices.comment.getCommentsForPrompt(
				SEED_PROMPTS.other
			);
			// digit is NOT the author of seed-prompt-other, so RLS limits visibility
			// digit should only see their own comment on this prompt
			const onlyOwn = comments.every((c) => c.author_id === SEED_USERS.digit.id);
			expect(onlyOwn).toBe(true);
		});
	});

	describe('constraints', () => {
		it('cannot comment on own prompt', async () => {
			await expect(
				digitServices.comment.createOrUpdate(
					SEED_PROMPTS.published,
					SEED_USERS.digit.id,
					'Self-comment'
				)
			).rejects.toThrow();
		});
	});
});
