import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const authFile = join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
	await page.goto('/login');

	// Wait for form to be ready
	await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

	// Fill form fields
	const emailInput = page.getByRole('textbox', { name: 'Email' });
	const passwordInput = page.getByRole('textbox', { name: 'Password' });

	await emailInput.click();
	await emailInput.fill('test@dyad.berlin');

	await passwordInput.click();
	await passwordInput.fill('test123');

	// Submit
	await page.getByRole('button', { name: 'Sign in' }).click();

	// Wait for redirect to dashboard
	await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

	// Save auth state
	await page.context().storageState({ path: authFile });
});
