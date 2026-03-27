import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

test('Full flow: respond → invite → accept', async ({ browser }) => {
	const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

	// Get Sophie's ID
	const { data: users } = await admin.auth.admin.listUsers();
	const sophie = users?.users.find(u => u.email === 'sophie@dyad.berlin');
	if (!sophie) throw new Error('Sophie user not found');

	// Create a published conversation with a time slot
	const conversationId = nanoid();

	await admin.from('prompts').insert({
		id: conversationId,
		author_id: sophie.id,
		title: 'E2E: Conversation about testing',
		body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test conversation.' }] }] },
		cover_image_url: `${SUPABASE_URL}/storage/v1/object/public/uploads/seed/test-cover.png`,
		state: 'published',
		published_at: new Date().toISOString(),
		region: 'berlin'
	});

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
	});

	try {
		// === Tom responds ===
		const tomContext = await browser.newContext({ storageState: 'tests/.auth/tom.json' });
		const tomPage = await tomContext.newPage();

		await tomPage.goto(`/conversations/${conversationId}`);
		await expect(tomPage.getByText('E2E: Conversation about testing')).toBeVisible();
		await expect(tomPage.getByText('Mitte')).toBeVisible(); // Read-only slots visible

		await tomPage.getByPlaceholder('Write a response...').fill('I want to discuss this');
		await tomPage.getByRole('button', { name: 'Send' }).click();
		await expect(tomPage.getByText('I want to discuss this')).toBeVisible({ timeout: 5000 });
		await expect(tomPage.getByText('Would you like to meet @sophie in person?')).toBeVisible();

		// === Tom sends invitation ===
		await tomPage.getByRole('button', { name: 'Select' }).first().click();
		await tomPage.getByPlaceholder('Add a message...').fill('See you there!');
		await tomPage.getByRole('button', { name: 'Invite to meet' }).click();
		await expect(tomPage.getByText('Invitation sent')).toBeVisible({ timeout: 5000 });

		await tomContext.close();

		// === Sophie sees invitation on profile ===
		const sophieContext = await browser.newContext({ storageState: 'tests/.auth/sophie.json' });
		const sophiePage = await sophieContext.newPage();

		await sophiePage.goto('/profile');
		await expect(sophiePage.getByText('@tom wants to meet')).toBeVisible({ timeout: 5000 });

		// === Sophie accepts ===
		await sophiePage.getByRole('button', { name: 'Accept' }).click();
		await sophiePage.waitForURL(/\/meetings\//, { timeout: 10000 });
		await expect(sophiePage.getByText('Meeting with @tom').first()).toBeVisible();

		await sophieContext.close();
	} finally {
		// Cleanup
		await admin.from('meetings').delete().eq('prompt_id', conversationId);
		await admin.from('prompt_invitations').delete().eq('prompt_id', conversationId);
		await admin.from('prompt_comments').delete().eq('prompt_id', conversationId);
		await admin.from('time_slots').delete().eq('prompt_id', conversationId);
		await admin.from('prompts').delete().eq('id', conversationId);
	}
});
