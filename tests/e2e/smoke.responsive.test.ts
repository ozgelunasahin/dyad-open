import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../helpers/auth.js';

test.describe('Smoke tests', () => {
	test('landing page loads for anonymous users', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('.left-title')).toBeVisible();
		// The join CTA opens the waitlist dialog with its "Join waitlist" button.
		await page.getByRole('button', { name: /^join$/i }).first().click();
		await expect(page.getByRole('button', { name: /join waitlist/i })).toBeVisible();
	});

	test('Sophie can log in and see discover page', async ({ browser }) => {
		const context = await browser.newContext({ storageState: TEST_USERS.sophie.storagePath });
		const page = await context.newPage();

		await page.goto('/discover');
		await expect(page).toHaveURL('/discover');
		await context.close();
	});

	test('Sophie can navigate to profile', async ({ browser }) => {
		const context = await browser.newContext({ storageState: TEST_USERS.sophie.storagePath });
		const page = await context.newPage();

		await page.goto('/profile');
		// Profile card shows username
		await expect(page.locator('.profile-handle')).toBeVisible();
		// Profile shows sign-out link (always visible, no sidebar)
		await expect(page.locator('.sign-out-link')).toBeVisible();
		await context.close();
	});

	test('Tom can log in and see discover page', async ({ browser }) => {
		const context = await browser.newContext({ storageState: TEST_USERS.tom.storagePath });
		const page = await context.newPage();

		await page.goto('/discover');
		await expect(page).toHaveURL('/discover');
		await context.close();
	});

	test('Map view toggles', async ({ browser }) => {
		const context = await browser.newContext({ storageState: TEST_USERS.sophie.storagePath });
		const page = await context.newPage();

		await page.goto('/discover');
		// Discover now shows map by default — toggle to list, then back to map
		const toggleBtn = page.getByRole('button', { name: /Map view|List view/i });
		await expect(toggleBtn).toBeVisible({ timeout: 5000 });
		await toggleBtn.click();
		// Should still have the toggle visible after clicking
		await expect(page.getByRole('button', { name: /Map view|List view/i })).toBeVisible();
		await context.close();
	});
});
