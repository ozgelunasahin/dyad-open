import { test as setup, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/auth.js';

const users = [
	{ ...TEST_USERS.sophie, file: TEST_USERS.sophie.storagePath },
	{ ...TEST_USERS.tom, file: TEST_USERS.tom.storagePath },
];

for (const user of users) {
	setup(`authenticate ${user.email}`, async ({ page }) => {
		// Delay between auth attempts to avoid rate limiting and Svelte hydration races
		await page.waitForTimeout(2000);
		await page.goto('/login');
		await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

		await page.locator('#email').fill(user.email);
		await page.locator('#password').fill(user.password);

		await page.getByRole('button', { name: 'Sign in' }).click();

		// Wait for redirect — could be /discover or /feedback/[id] (if gated)
		await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });
		await page.context().storageState({ path: user.file });
	});
}
