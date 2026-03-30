import { test, expect } from '@playwright/test';
import { nanoid } from 'nanoid';
import { createAdminClient, TEST_USERS } from '../helpers/auth.js';

test('Full flow: respond → invite → accept', async ({ browser }) => {
	const admin = createAdminClient();
	const sophie = TEST_USERS.sophie;

	// Create a published conversation with a time slot
	const conversationId = nanoid();

	await admin.from('prompts').insert({
		id: conversationId,
		author_id: sophie.id,
		title: 'E2E: Conversation about testing',
		body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test conversation.' }] }] },
		cover_image_url: 'http://127.0.0.1:54321/storage/v1/object/public/uploads/seed/test-cover.png',
		state: 'published',
		published_at: new Date().toISOString(),
		region: 'berlin'
	}).throwOnError();

	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(15, 0, 0, 0);

	await admin.from('time_slots').insert({
		prompt_id: conversationId,
		start_time: tomorrow.toISOString(),
		duration_minutes: 60,
		exact_location: { place_id: 'test', name: 'Test Café', address: 'Test Street 1, Berlin', lat: 52.52, lng: 13.405 },
		general_area: 'Mitte',
		general_area_lat: 52.52,
		general_area_lng: 13.405
	}).throwOnError();

	try {
		// === Tom responds ===
		const tomContext = await browser.newContext({ storageState: TEST_USERS.tom.storagePath });
		const tomPage = await tomContext.newPage();

		await tomPage.goto(`/conversations/${conversationId}`);
		await expect(tomPage.getByText('E2E: Conversation about testing')).toBeVisible();

		await tomPage.locator('.response-input').fill('I want to discuss this');
		// Use the response section's Send button (not the FeedbackModal's Send)
		await tomPage.locator('.response-section .btn-secondary').click();
		await expect(tomPage.getByText('I want to discuss this')).toBeVisible({ timeout: 5000 });
		await expect(tomPage.getByText('Would you like to meet @sophie in person?')).toBeVisible();

		// === Tom sends invitation (tap slot card directly) ===
		await tomPage.getByRole('button', { name: /Tomorrow|Today|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|\d+ \w+/ }).first().click();
		await tomPage.getByPlaceholder('Add a note (optional)').fill('See you there!');
		await tomPage.getByRole('button', { name: 'Send invitation' }).click();
		await expect(tomPage.getByText('You have invited @sophie, waiting for them to confirm.')).toBeVisible({ timeout: 5000 });

		await tomContext.close();

		// === Sophie sees invitation on profile ===
		const sophieContext = await browser.newContext({ storageState: TEST_USERS.sophie.storagePath });
		const sophiePage = await sophieContext.newPage();

		await sophiePage.goto('/profile');
		await expect(sophiePage.getByText('@tom wants to meet')).toBeVisible({ timeout: 5000 });

		// === Sophie accepts ===
		await sophiePage.getByRole('button', { name: 'Accept' }).first().click();
		await sophiePage.waitForURL(/\/meetings\//, { timeout: 10000 });
		await expect(sophiePage.getByText('Meeting with @tom').first()).toBeVisible();

		await sophieContext.close();
	} finally {
		// Cleanup in FK order — find meetings first (feedback_forms references meeting UUID, not prompt nanoid)
		const { data: meetings } = await admin.from('meetings').select('id').eq('prompt_id', conversationId);
		for (const m of meetings ?? []) {
			await admin.from('feedback_forms').delete().eq('meeting_id', m.id);
			await admin.from('cancellation_records').delete().eq('meeting_id', m.id);
		}
		await admin.from('meetings').delete().eq('prompt_id', conversationId);
		await admin.from('prompt_invitations').delete().eq('prompt_id', conversationId);
		await admin.from('prompt_comments').delete().eq('prompt_id', conversationId);
		await admin.from('time_slots').delete().eq('prompt_id', conversationId);
		await admin.from('prompts').delete().eq('id', conversationId);
	}
});
