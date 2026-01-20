import { test, expect } from '@playwright/test';

test.describe('Canvas', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to a canvas with content
		await page.goto('/dashboard');
		await page.getByRole('link', { name: /Getting Started/ }).click();
		await expect(page).toHaveURL(/\/canvas\//);
	});

	test('edit mode persists after navigating back from child card', async ({ page }) => {
		// Double-click to enter edit mode
		await page.getByRole('heading', { name: 'Slow Reading' }).dblclick();

		// Verify we're in edit mode
		await expect(page.locator('[data-editing="true"]')).toBeVisible();

		// Click a link to navigate to child
		await page.getByRole('button', { name: 'Isabelle Stengers' }).click();

		// Wait for child card to appear
		await expect(page.getByRole('heading', { name: 'Isabelle Stengers' })).toBeVisible();

		// Navigate back with ArrowLeft
		await page.keyboard.press('ArrowLeft');

		// Wait for animation
		await page.waitForTimeout(500);

		// Verify we're still in edit mode on parent card
		await expect(page.locator('[data-editing="true"]')).toBeVisible();
		await expect(page.locator('.ProseMirror-focused')).toBeVisible();
	});

	test('can create wikilink with Ctrl+K', async ({ page }) => {
		// Double-click to enter edit mode on heading
		await page.getByRole('heading', { name: 'Slow Reading' }).dblclick();
		await expect(page.locator('[data-editing="true"]')).toBeVisible();

		// Triple-click to select the entire heading text
		await page.getByRole('heading', { name: 'Slow Reading' }).click({ clickCount: 3 });

		// Create link with Ctrl+K
		await page.keyboard.press('Control+k');

		// Verify wikilink was created from the heading text
		await expect(page.locator('.wikilink').filter({ hasText: 'Slow Reading' })).toBeVisible();
	});

	test('ArrowLeft closes child card before exiting link focus mode', async ({ page }) => {
		// Focus the card
		await page.getByRole('heading', { name: 'Slow Reading' }).click();

		// Press Tab to enter link focus mode
		await page.keyboard.press('Tab');

		// Verify a link is highlighted
		await expect(page.locator('.wikilink.link-focused')).toBeVisible();

		// Press ArrowRight to open the highlighted link
		await page.keyboard.press('ArrowRight');

		// Wait for child card to appear
		await expect(page.locator('[data-note-id]')).toHaveCount(2);

		// Press ArrowLeft - should close child card but stay in link focus
		await page.keyboard.press('ArrowLeft');
		await page.waitForTimeout(300);

		// Child card should be closed
		await expect(page.locator('[data-note-id]')).toHaveCount(1);

		// Should still have a highlighted link
		await expect(page.locator('.wikilink.link-focused')).toBeVisible();
	});
});
