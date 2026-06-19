import { test, expect } from '@playwright/test';
import { createAdminClient, TEST_USERS } from '../helpers/auth.js';

// End-to-end proof of the notification hint: it renders from real layout data at
// a notification moment for an address-less member, and self-extinguishes once an
// address is set (the NULL→set transition the plan flags as only provable e2e).
//
// Sophie owns seed-prompt-sophie; a seeded response from Tom makes her author
// "Responses" section render, which carries the hint (U3). The hint, the
// {#if !data.hasNotificationEmail} gate, and the derived signal (U1) are shared
// by the meeting page (U4) and onboarding (U5), so the author moment is the
// representative integration proof for the whole surface.
//
// The onboarding step (U5) is intentionally NOT covered here: it renders behind
// the discover welcome modal, a client-only surface gated on ?welcome=1, the
// dyad_onboarding_done localStorage flag, and !isGuest — preconditions an e2e
// can't drive deterministically for a seeded user. U5's copy is covered by the
// copy-contract unit test (src/lib/copy.test.ts) and its wiring by svelte-check.
test.describe('notification hint — author responses moment', () => {
	const admin = createAdminClient();
	const sophie = TEST_USERS.sophie;
	const tom = TEST_USERS.tom;
	const promptId = 'seed-prompt-sophie';

	test.use({ storageState: sophie.storagePath });

	test.beforeAll(async () => {
		// A response from Tom on Sophie's prompt → a row in her Responses section.
		await admin.from('prompt_comments').delete().eq('prompt_id', promptId).eq('author_id', tom.id);
		await admin
			.from('prompt_comments')
			.insert({ prompt_id: promptId, author_id: tom.id, body: 'This resonates — I would love to talk about it.' })
			.throwOnError();
		// Sophie starts address-less (no row → hasNotificationEmail false).
		await admin.from('notification_settings').delete().eq('user_id', sophie.id);
	});

	test.afterAll(async () => {
		await admin.from('prompt_comments').delete().eq('prompt_id', promptId).eq('author_id', tom.id);
		await admin.from('notification_settings').delete().eq('user_id', sophie.id);
	});

	test('offers the hint to an address-less author, then hides it once an address is set', async ({ page }) => {
		test.setTimeout(60000);

		const hintLink = page.getByRole('link', { name: 'get notified' });

		// Address-less: the hint is offered at the responses moment and points to
		// the existing opt-in form (never captures inline).
		await page.goto(`/conversations/${promptId}`);
		await expect(page.getByText('Responses')).toBeVisible();
		await expect(hintLink).toBeVisible();
		await expect(hintLink).toHaveAttribute('href', '/profile/preferences');

		// Set an address out-of-band, then reload: the layout loader now derives
		// hasNotificationEmail = true and the hint self-extinguishes.
		await admin
			.from('notification_settings')
			.upsert({ user_id: sophie.id, email: 'sophie-notify@test.invalid' }, { onConflict: 'user_id' })
			.throwOnError();
		await page.reload();
		await expect(page.getByText('Responses')).toBeVisible();
		await expect(hintLink).toHaveCount(0);
	});
});
