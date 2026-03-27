import { test as setup, expect } from '@playwright/test';

const users = [
	{ email: 'sophie@dyad.berlin', password: 'local-fixture-not-a-secret', file: 'tests/.auth/sophie.json' },
	{ email: 'tom@dyad.berlin', password: 'local-fixture-not-a-secret', file: 'tests/.auth/tom.json' },
];

for (const user of users) {
	setup(`authenticate ${user.email}`, async ({ page }) => {
		// Small delay between auth attempts to avoid rate limiting
		await page.waitForTimeout(500);
		await page.goto('/login');
		await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

		const emailInput = page.getByRole('textbox', { name: 'Email' });
		const passwordInput = page.getByRole('textbox', { name: 'Password' });

		await emailInput.click();
		await emailInput.fill(user.email);
		await passwordInput.click();
		await passwordInput.fill(user.password);

		await page.getByRole('button', { name: 'Sign in' }).click();

		// Wait for redirect — could be /discover or /feedback/[id] (if gated)
		// Supabase auth can be slow on first login
		await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });
		await page.context().storageState({ path: user.file });
	});
}
