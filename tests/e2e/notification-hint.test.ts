import { test, expect } from '@playwright/test';
import { createAdminClient, TEST_USERS } from '../helpers/auth.js';

// End-to-end proof of the notification hint: it renders from real layout data at
// a notification moment for an address-less member, and self-extinguishes once an
// address is set (the NULL→set transition the plan flags as only provable e2e).
//
// The hint shows at three meeting-related moments: the author's conversation
// (someone may invite them to meet), the inviter's pending invitation (here),
// and the meeting page. Tom invites Lisa on her published prompt, so his
// conversation view renders the pending block, which carries the hint. The hint,
// the {#if !data.hasNotificationEmail} gate, and the derived signal (U1) are
// shared across all three surfaces, so the inviter moment is the representative
// integration proof. (The author and meeting surfaces reuse the same component +
// gate; the meeting page also needs a full meeting FK chain to seed.)
test.describe('notification hint — inviter pending moment', () => {
	const admin = createAdminClient();
	const tom = TEST_USERS.tom;
	const lisa = TEST_USERS.lisa;
	const promptId = 'seed-prompt-published'; // Lisa's published prompt, has future slots
	const slotId = 'a0000001-0000-0000-0000-000000000001';

	test.use({ storageState: tom.storagePath });

	test.beforeAll(async () => {
		// Clean slate for Tom on this prompt: drop any prior meeting first (it
		// FK-references the invitation and would otherwise mask the pending block
		// with a confirmed gathering), then any invitation, then seed one pending
		// invite so his conversation view renders the pending block + hint.
		await admin.from('meetings').delete().eq('prompt_id', promptId).eq('participant_b', tom.id);
		await admin.from('prompt_invitations').delete().eq('prompt_id', promptId).eq('inviter_id', tom.id);
		await admin
			.from('prompt_invitations')
			.insert({ prompt_id: promptId, slot_id: slotId, inviter_id: tom.id, invitee_id: lisa.id, state: 'pending' })
			.throwOnError();
		// Tom starts address-less (no row → hasNotificationEmail false).
		await admin.from('notification_settings').delete().eq('user_id', tom.id);
	});

	test.afterAll(async () => {
		await admin.from('meetings').delete().eq('prompt_id', promptId).eq('participant_b', tom.id);
		await admin.from('prompt_invitations').delete().eq('prompt_id', promptId).eq('inviter_id', tom.id);
		await admin.from('notification_settings').delete().eq('user_id', tom.id);
	});

	test('offers the hint to an address-less inviter, then hides it once an address is set', async ({ page }) => {
		test.setTimeout(60000);

		const hintLink = page.getByRole('link', { name: 'get notified' });

		// Address-less: the pending block renders and the hint is offered, pointing
		// to the opt-in form (never captures inline).
		await page.goto(`/conversations/${promptId}`);
		await expect(page.getByText('waiting for them to confirm')).toBeVisible();
		await expect(hintLink).toBeVisible();
		await expect(hintLink).toHaveAttribute('href', '/profile/preferences');

		// Set an address out-of-band, then reload: the layout loader now derives
		// hasNotificationEmail = true and the hint self-extinguishes (the pending
		// block itself stays, proving the hint — not the block — is what gated).
		await admin
			.from('notification_settings')
			.upsert({ user_id: tom.id, email: 'tom-notify@test.invalid' }, { onConflict: 'user_id' })
			.throwOnError();
		await page.reload();
		await expect(page.getByText('waiting for them to confirm')).toBeVisible();
		await expect(hintLink).toHaveCount(0);
	});
});
