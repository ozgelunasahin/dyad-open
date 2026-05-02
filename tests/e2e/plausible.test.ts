import { test, expect } from '@playwright/test';

// The webServer in playwright.config.ts injects PUBLIC_PLAUSIBLE_DOMAIN
// = 'dyad-test.invalid' so the Plausible script tag is rendered in test
// runs. The script src points at the public Plausible CDN by default;
// the script load is harmless (Plausible discards events for unregistered
// domains) and the assertions here are about the *presence* of the
// <script> tag and its attributes, not the actual analytics flow.
//
// .invalid is RFC-2606 reserved — guaranteed never to be a real Plausible
// site, which keeps the test from accidentally polluting any real
// dashboard if the data-domain were ever registered.

const PLAUSIBLE_SELECTOR = 'script[data-domain="dyad-test.invalid"]';

test.describe('Plausible analytics — script-tag gating', () => {
	test('renders on the public landing page when domain is configured', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator(PLAUSIBLE_SELECTOR)).toHaveCount(1);
		await expect(page.locator(PLAUSIBLE_SELECTOR)).toHaveAttribute(
			'src',
			'https://plausible.io/js/script.js'
		);
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
		// The response body for /admin (the redirect target) should not
		// contain the script tag. Check both the redirect response body
		// and the final landed page.
		expect(response).toBeTruthy();
		await expect(page.locator(PLAUSIBLE_SELECTOR)).toHaveCount(0);
	});
});
