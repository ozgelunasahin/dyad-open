import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../helpers/auth.js';

test.describe('Meeting lifecycle states', () => {

	test('scheduled meeting shows details and cancel button', async ({ browser }) => {
		const ctx = await browser.newContext({ storageState: TEST_USERS.nina.storagePath });
		const page = await ctx.newPage();
		await page.goto('/meetings/c0000002-0000-0000-0000-000000000001');
		await expect(page.getByText('Meeting with @kai')).toBeVisible();
		await expect(page.getByText('Kreuzberg')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Cancel meeting' })).toBeVisible();
		await expect(page.getByText('Add to calendar')).toBeVisible();
		await ctx.close();
	});

	test('cancelled early meeting shows no cancel button', async ({ browser }) => {
		const ctx = await browser.newContext({ storageState: TEST_USERS.nina.storagePath });
		const page = await ctx.newPage();
		await page.goto('/meetings/c0000003-0000-0000-0000-000000000001');
		await expect(page.getByText('Meeting with @kai')).toBeVisible();
		await expect(page.getByText('Kreuzberg')).toBeVisible();
		await expect(page.getByText('Cancel meeting')).not.toBeVisible();
		await expect(page.getByText('You have feedback to submit')).not.toBeVisible();
		await ctx.close();
	});

	test('cancelled late meeting shows no cancel button', async ({ browser }) => {
		const ctx = await browser.newContext({ storageState: TEST_USERS.lisa.storagePath });
		const page = await ctx.newPage();
		await page.goto('/meetings/c0000004-0000-0000-0000-000000000001');
		await expect(page.getByText('Meeting with @marco')).toBeVisible();
		await expect(page.getByText('Cancel meeting')).not.toBeVisible();
		await ctx.close();
	});

	test('awaiting feedback shows submitted status', async ({ browser }) => {
		// kai already submitted feedback for this meeting
		const ctx = await browser.newContext({ storageState: TEST_USERS.kai.storagePath });
		const page = await ctx.newPage();
		await page.goto('/meetings/c0000005-0000-0000-0000-000000000001');
		await expect(page.getByText('Meeting with @marco')).toBeVisible();
		await expect(page.getByText('Feedback submitted')).toBeVisible();
		await ctx.close();
	});

	test('completed meeting shows revealed feedback', async ({ browser }) => {
		const ctx = await browser.newContext({ storageState: TEST_USERS.nina.storagePath });
		const page = await ctx.newPage();
		await page.goto('/meetings/c0000006-0000-0000-0000-000000000001');
		await expect(page.getByText('Meeting with @marco')).toBeVisible();
		await expect(page.getByText('What they shared with you')).toBeVisible();
		await ctx.close();
	});

	test('pending invitation shows on conversation page (inviter view)', async ({ browser }) => {
		// lisa invited marco — as the non-author inviter, she sees her pending invitation status
		const ctx = await browser.newContext({ storageState: TEST_USERS.lisa.storagePath });
		const page = await ctx.newPage();
		await page.goto('/conversations/seed-prompt-marco');
		await expect(page.getByText('Language and what slips through it')).toBeVisible();
		await expect(page.getByText('You have invited @marco, waiting for them to confirm.')).toBeVisible();
		await ctx.close();
	});

	test('confirmed meeting shows on conversation page', async ({ browser }) => {
		const ctx = await browser.newContext({ storageState: TEST_USERS.kai.storagePath });
		const page = await ctx.newPage();
		await page.goto('/conversations/seed-prompt-scheduled');
		await expect(page.getByText('On walking without a destination')).toBeVisible();
		await expect(page.getByText('Confirmed')).toBeVisible();
		await expect(page.getByText('You are meeting @nina')).toBeVisible();
		await ctx.close();
	});

	test('accepted invitation with cancelled meeting shows no accept button', async ({ browser }) => {
		// lisa views seed-prompt-cancelled-late — invitation is accepted but meeting cancelled
		const ctx = await browser.newContext({ storageState: TEST_USERS.lisa.storagePath });
		const page = await ctx.newPage();
		await page.goto('/conversations/seed-prompt-cancelled-late');
		await expect(page.getByText('Why we avoid eye contact on the U-Bahn')).toBeVisible();
		// Should NOT show accept button since invitation.state is 'accepted'
		await expect(page.getByText('Accept')).not.toBeVisible();
		await ctx.close();
	});
});
