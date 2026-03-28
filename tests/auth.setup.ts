import { test as setup, expect } from '@playwright/test';

const users = [
	{ email: 'sophie@dyad.berlin', password: 'dyad2026!', file: 'tests/.auth/sophie.json' },
	{ email: 'tom@dyad.berlin', password: 'dyad2026!', file: 'tests/.auth/tom.json' },
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
		// Supabase auth can be slow on first login
		await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });
		await page.context().storageState({ path: user.file });
	});
}
