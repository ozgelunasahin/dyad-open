import { test, expect } from '@playwright/test';

// The zine (steward-ownership / governance / community-care) and the landing
// pin→card→Join funnel are all anonymous surfaces, so no auth storage state is
// needed. The funnel test depends on seeded geo-located prompts in the local
// Supabase stack; it skips gracefully when no pins are present.

const ZINE_PAGES = ['/steward-ownership', '/governance', '/community-care'];

test.describe('Zine pages — smoke', () => {
	for (const path of ZINE_PAGES) {
		test(`${path} returns 200 and renders the wordmark + footer`, async ({ page }) => {
			const response = await page.goto(path);
			expect(response?.status()).toBe(200);
			// Wordmark in the zine header.
			await expect(page.locator('.zine-wordmark')).toBeVisible();
			// ZineFooter colophon (centralized copy) anchors the bottom of the page.
			await expect(page.locator('.footer-colophon')).toBeVisible();
		});
	}
});

test.describe('Landing — pin → card → Join funnel (best effort)', () => {
	test('clicking a map pin opens a card whose Join CTA opens the waitlist', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('.left-title')).toBeVisible();

		// Wait for the lazy-loaded map markers. If the seed has no geo-located
		// published prompts, there are no pins — skip rather than fail.
		const marker = page.locator('.marker-pin').first();
		try {
			await marker.waitFor({ state: 'visible', timeout: 8000 });
		} catch {
			test.skip(true, 'No geo-located prompts seeded — nothing to click.');
			return;
		}

		await marker.click();
		await expect(page.locator('.map-card')).toBeVisible();

		await page.locator('.map-card-cta').click();
		await expect(page.getByRole('button', { name: /join waitlist/i })).toBeVisible();
	});
});
