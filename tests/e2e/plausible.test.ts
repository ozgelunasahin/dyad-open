import { test, expect } from '@playwright/test';

// The webServer in playwright.config.ts injects PUBLIC_PLAUSIBLE_SCRIPT_SRC
// = 'https://plausible.io/js/pa-test.invalid.js' so the Plausible script tag
// is rendered in test runs. The script is never loaded — assertions are about
// the *presence* of the <script> tag and its attributes.
//
// .invalid is RFC-2606 reserved — guaranteed never to be a real Plausible
// site, which keeps the test from accidentally polluting any real dashboard.

const PLAUSIBLE_SRC = 'https://plausible.io/js/pa-test.invalid.js';
const PLAUSIBLE_SELECTOR = `script[src="${PLAUSIBLE_SRC}"]`;

test.describe('Plausible analytics — script-tag gating', () => {
	test('renders on the public landing page when domain is configured', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator(PLAUSIBLE_SELECTOR)).toHaveCount(1);
		await expect(page.locator(PLAUSIBLE_SELECTOR)).toHaveAttribute('src', PLAUSIBLE_SRC);
	});

	test('does NOT render on /admin/waitlist (path-based admin gate)', async ({ page }) => {
		// /admin/waitlist passes through the path-based admin gate. The
		// script tag must be absent so admin operators are not analyticised.
		await page.goto('/admin/waitlist');
		await expect(page.locator(PLAUSIBLE_SELECTOR)).toHaveCount(0);
	});

	test('does NOT render on the bare /admin path (regression for trailing-slash bug)', async ({ page }) => {
		// /admin server-redirects to /admin/waitlist, but before that
		// redirect fires the layout SSR runs. The first cut of the gate
		// used startsWith('/admin/') with a trailing slash, which let the
		// bare /admin path leak the script tag. This test pins the fix.
		const response = await page.goto('/admin', { waitUntil: 'commit' });
		expect(response).toBeTruthy();
		await expect(page.locator(PLAUSIBLE_SELECTOR)).toHaveCount(0);
	});
});
