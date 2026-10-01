import { test, expect } from '@playwright/test';

// The zine (wiggling / governance / community-care / docs) and the landing
// Join funnel are all anonymous surfaces, so no auth storage state is needed.
// Steward-ownership was removed (archived to src/lib/archive/) — dyad is not yet
// steward-owned; /wiggling + /docs replaced it in the restructure. /docs is a
// self-contained master-detail surface with its own chrome (no zine header
// wordmark), so it's excluded from this wordmark+footer smoke.

const ZINE_PAGES = ['/wiggling', '/community-care'];

test.describe('Zine pages — smoke', () => {
	for (const path of ZINE_PAGES) {
		test(`${path} returns 200 and renders the wordmark + footer`, async ({ page }) => {
			const response = await page.goto(path);
			expect(response?.status()).toBe(200);
			// Wordmark in the zine header.
			await expect(page.locator('.zine-wordmark')).toBeVisible();
			// ZineFooter renders its column headers at the bottom of the page.
			await expect(page.locator('.footer-col-head').first()).toBeVisible();
		});
	}
});

test.describe('Landing — Join funnel', () => {
	test('the Join action leads to signup', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('.left-title')).toBeVisible();

		await page.getByTestId('join-cta').click();
		await page.waitForURL(/\/signup/);
		await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
	});

	test('old /waitlist links land on signup', async ({ page }) => {
		await page.goto('/waitlist');
		await expect(page).toHaveURL('/signup');
		await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
	});
});
