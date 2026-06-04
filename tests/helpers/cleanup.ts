import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from './auth.js';

/**
 * Delete all non-seed test data. Call at the START and END of each integration
 * test file to ensure isolation regardless of what other test files do.
 *
 * Strategy: find all non-seed prompt IDs, then delete their children in FK order.
 * Seed prompts (id starting with 'seed-prompt-') and their data are preserved.
 * Seed meetings (ava/ben feedback-gated) are preserved.
 */
export async function cleanTestData(admin?: SupabaseClient): Promise<void> {
	const client = admin ?? createAdminClient();

	// Find non-seed prompts created by tests
	const { data: testPrompts } = await client
		.from('prompts')
		.select('id')
		.not('id', 'like', 'seed-prompt-%');

	const testPromptIds = (testPrompts ?? []).map(p => p.id);

	if (testPromptIds.length > 0) {
		// Delete children of test prompts in FK order
		for (const pid of testPromptIds) {
			// meetings → feedback_forms (via meeting), cancellation_records
			const { data: meetings } = await client.from('meetings').select('id').eq('prompt_id', pid);
			for (const m of meetings ?? []) {
				await client.from('feedback_forms').delete().eq('meeting_id', m.id);
				await client.from('cancellation_records').delete().eq('meeting_id', m.id);
			}
			// group_feedback FK on prompt_id is ON DELETE RESTRICT, so it must be
			// cleared before the prompt (and before time_slots, which it also
			// references) is deleted.
			await client.from('group_feedback').delete().eq('prompt_id', pid);
			await client.from('meetings').delete().eq('prompt_id', pid);
			await client.from('prompt_invitations').delete().eq('prompt_id', pid);
			await client.from('prompt_comments').delete().eq('prompt_id', pid);
			await client.from('time_slots').delete().eq('prompt_id', pid);
		}
		// Delete the test prompts themselves
		await client.from('prompts').delete().not('id', 'like', 'seed-prompt-%').throwOnError();
	}

	// Clean up test-created comments on non-seed prompts
	await client.from('prompt_comments').delete().not('prompt_id', 'like', 'seed-prompt-%');
}
