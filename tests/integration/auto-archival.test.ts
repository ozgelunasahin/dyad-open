import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuthenticatedClient, SEED_USERS } from '../helpers/auth.js';
import { createServices } from '../helpers/db.js';
import { cleanTestData } from '../helpers/cleanup.js';

describe('Auto-archival', () => {
	let digitClient: SupabaseClient;
	let promptId: string;

	beforeAll(async () => {
		digitClient = await createAuthenticatedClient(
			SEED_USERS.digit.email,
			SEED_USERS.digit.password
		);
	});

	it('creates a prompt and publishes with a slot in the past', async () => {
		const { promptCommand } = createServices(digitClient);

		// Create and publish a prompt
		const prompt = await promptCommand.create(SEED_USERS.digit.id, {
			title: 'Archival test prompt'
		});
		promptId = prompt.id;

		// Publish with a slot 2 days from now (valid for publishing)
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 2);

		await promptCommand.publish(promptId, SEED_USERS.digit.id, [
			{
				start_time: futureDate.toISOString(),
				duration_minutes: 60,
				location: {
					place_id: 'test-archival',
					name: 'Test Place',
					address: 'Teststr 1, 10999 Berlin',
					lat: 52.4988,
					lng: 13.4238
				}
			}
		]);

		// Verify it's published
		const { promptQuery } = createServices(digitClient);
		const prompts = await promptQuery.getMyPrompts(SEED_USERS.digit.id);
		const published = prompts.find((p) => p.id === promptId);
		expect(published?.state).toBe('published');
	});

	it('does NOT archive a prompt with future slots', async () => {
		// Call the archival function directly
		const { data, error } = await digitClient.rpc('archive_stale_prompts');
		expect(error).toBeNull();

		// Our prompt should still be published (slot is in the future)
		const { promptQuery } = createServices(digitClient);
		const prompts = await promptQuery.getMyPrompts(SEED_USERS.digit.id);
		const prompt = prompts.find((p) => p.id === promptId);
		expect(prompt?.state).toBe('published');
	});

	it('archives a prompt after all slots are expired', async () => {
		// Manually expire the slot by setting start_time to the past
		await digitClient
			.from('time_slots')
			.update({ start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })
			.eq('prompt_id', promptId);

		// Call the archival function
		const { data: archivedCount, error } = await digitClient.rpc('archive_stale_prompts');
		expect(error).toBeNull();
		expect(archivedCount).toBeGreaterThanOrEqual(1);

		// Verify it's now archived
		const { promptQuery } = createServices(digitClient);
		const prompts = await promptQuery.getMyPrompts(SEED_USERS.digit.id);
		const prompt = prompts.find((p) => p.id === promptId);
		expect(prompt?.state).toBe('archived');
		expect(prompt?.archived_at).toBeTruthy();
	});

	afterAll(() => cleanTestData());
});
