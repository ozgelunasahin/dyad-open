import { test, expect } from '@playwright/test';
import { nanoid } from 'nanoid';
import { createAdminClient, TEST_USERS } from '../helpers/auth.js';

test.describe('Signup flow', () => {
	const testEmail = 'signup-test@test.invalid';
	const testPassword = 'local-fixture-not-a-secret';
	const testUsername = `testuser${nanoid(6).toLowerCase()}`;
	const admin = createAdminClient();
	let createdUserId: string | null = null;
	let invitationToken: string;

	test.beforeAll(async () => {
		// Sweep-delete any orphaned test user from prior crashed runs
		const { data: users } = await admin.auth.admin.listUsers();
		const orphan = users?.users.find(u => u.email === testEmail);
		if (orphan) {
			await admin.from('profiles').delete().eq('id', orphan.id);
			await admin.auth.admin.deleteUser(orphan.id);
		}

		// Create a valid invitation
		invitationToken = nanoid();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		await admin.from('invitations').insert({
			email: testEmail,
			token: invitationToken,
			expires_at: expiresAt.toISOString(),
			invited_by: TEST_USERS.lisa.id
		}).throwOnError();
	});

	test.afterAll(async () => {
		if (createdUserId) {
			await admin.from('profiles').delete().eq('id', createdUserId);
			await admin.auth.admin.deleteUser(createdUserId);
		}
		await admin.from('invitations').delete().eq('token', invitationToken);
	});

	test('can sign up via invitation link', async ({ page }) => {
		test.setTimeout(90000);

		await page.goto(`/join?token=${invitationToken}`);
		await expect(page.getByRole('heading', { name: "You're invited" })).toBeVisible();

		// Fill the form
		await page.locator('#username').fill(testUsername);
		await page.locator('#password').fill(testPassword);

		// Submit
		await page.getByRole('button', { name: 'Create account' }).click();

		// Wait for either:
		// - Redirect to /discover (auto-sign-in succeeded)
		// - "Welcome to dyad" heading (account created, manual sign-in needed)
		// - Error message (something went wrong)
		const result = await Promise.race([
			page.waitForURL(url => !url.pathname.includes('/join'), { timeout: 60000 })
				.then(() => 'redirected' as const),
			page.getByText('Welcome to dyad').waitFor({ timeout: 60000 })
				.then(() => 'success-message' as const),
			page.locator('.error-message').waitFor({ timeout: 60000 })
				.then(() => 'error' as const)
		]);

		if (result === 'error') {
			const errorText = await page.locator('.error-message').textContent();
			throw new Error(`Signup failed with error: ${errorText}`);
		}

		// Either redirected or got success message — both mean account was created
		const { data: users } = await admin.auth.admin.listUsers();
		const created = users?.users.find(u => u.email === testEmail);
		createdUserId = created?.id ?? null;
		expect(createdUserId).toBeTruthy();
	});
});
