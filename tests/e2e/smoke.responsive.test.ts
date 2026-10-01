import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../helpers/auth.js';

test.describe('Smoke tests', () => {
	test('landing page loads for anonymous users', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('.left-title')).toBeVisible();
		// The hero Join CTA navigates straight to /signup. Pin to the stable
		// data-testid — the header Join was folded into the hero action group,
		// so a class/text selector would be ambiguous.
		await page.locator('[data-testid="join-cta"]').click();
		await expect(page).toHaveURL('/signup');
		await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
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
		// newContext ignores the project's device config, so pin a phone
		// viewport explicitly — these assertions are about the mobile panes.
		const context = await browser.newContext({
			storageState: TEST_USERS.sophie.storagePath,
			viewport: { width: 390, height: 844 }
		});
		const page = await context.newPage();

		await page.goto('/discover');
		// Mobile split view IS the map (the list pane hides): assert the panes,
		// not just the toggle's presence, to lock in the map-first default.
		const toggleBtn = page.getByRole('button', { name: /Map view|List view/i });
		await expect(toggleBtn).toBeVisible({ timeout: 5000 });
		await expect(page.locator('.map-pane--split')).toBeVisible();
		await expect(page.locator('.list-pane')).toBeHidden();
		// Hydration gate: the toggle's click handler attaches only once the
		// page's JS is live, and the Leaflet container mounts from onMount —
		// clicking earlier is a silent no-op (see discover-preview.test.ts).
		await page.locator('.leaflet-container').waitFor({ timeout: 15000 });
		await toggleBtn.click();
		// List view: full-width list, no map.
		await expect(page.locator('.list-full')).toBeVisible();
		await expect(page.locator('.map-pane--split')).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Map view|List view/i })).toBeVisible();
		await context.close();
	});
});
