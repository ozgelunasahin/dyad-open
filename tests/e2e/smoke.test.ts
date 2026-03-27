import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
	test('landing page loads for anonymous users', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByText('in conversation')).toBeVisible();
		await expect(page.getByText('join waitlist')).toBeVisible();
	});

	test('Sophie can log in and see discover page', async ({ browser }) => {
		const context = await browser.newContext({ storageState: 'tests/.auth/sophie.json' });
		const page = await context.newPage();

		await page.goto('/discover');
		await expect(page).toHaveURL('/discover');
		// Should see the FloatingNav
		await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
		await context.close();
	});

	test('Sophie can navigate to profile', async ({ browser }) => {
		const context = await browser.newContext({ storageState: 'tests/.auth/sophie.json' });
		const page = await context.newPage();

		await page.goto('/profile');
		await expect(page.getByText('@sophie').first()).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Conversations' })).toBeVisible();
		await context.close();
	});

	test('Tom can log in and see discover page', async ({ browser }) => {
		const context = await browser.newContext({ storageState: 'tests/.auth/tom.json' });
		const page = await context.newPage();

		await page.goto('/discover');
		await expect(page).toHaveURL('/discover');
		await context.close();
	});

	test('Map view toggles', async ({ browser }) => {
		const context = await browser.newContext({ storageState: 'tests/.auth/sophie.json' });
		const page = await context.newPage();

		await page.goto('/discover');
		await page.getByRole('button', { name: 'Map view' }).click();

		// Should show the map container (Leaflet renders here)
		await expect(page.locator('.map-container')).toBeVisible({ timeout: 5000 });
		await context.close();
	});
});
