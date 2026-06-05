import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing the module under test.
vi.mock('$env/dynamic/private', () => ({ env: {} }));

const sendEmailMock = vi.fn().mockResolvedValue(true);
vi.mock('./email.js', () => ({ sendEmail: sendEmailMock }));

vi.mock('./app-settings.js', () => ({
	getEmailNotificationsEnabled: vi.fn().mockResolvedValue(true)
}));

const adminFromMock = vi.fn();
vi.mock('./supabase-admin.js', () => ({
	makeAdminClient: () => ({ from: adminFromMock })
}));

const { notifyInvitationReceived } = await import('./notification-emails.js');

// Build a chainable thenable that resolves to `{ data, error }`.
function chain(data: unknown) {
	const result = { data, error: null };
	const builder: Record<string, unknown> = {};
	for (const m of ['select', 'eq', 'maybeSingle']) builder[m] = () => builder;
	builder.then = (resolve: (v: typeof result) => unknown) => resolve(result);
	return builder;
}

const OPTED_IN_SETTINGS = {
	email: 'guest@example.org',
	invitation_received: true,
	invitation_answered: true,
	meeting_cancelled: true
};

describe('notification dispatch — access-expiry guard (R14)', () => {
	beforeEach(() => {
		sendEmailMock.mockClear();
		adminFromMock.mockReset();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('suppresses mail to an access-expired recipient', async () => {
		adminFromMock
			.mockReturnValueOnce(chain(OPTED_IN_SETTINGS)) // notification_settings
			.mockReturnValueOnce(
				chain({ access_expires_at: new Date(Date.now() - 3600_000).toISOString() })
			); // profiles — expired an hour ago

		await notifyInvitationReceived({ authorUserId: 'guest-id', promptId: 'p1' });
		expect(sendEmailMock).not.toHaveBeenCalled();
	});

	it('sends to an active guest (future expiry)', async () => {
		adminFromMock
			.mockReturnValueOnce(chain(OPTED_IN_SETTINGS))
			.mockReturnValueOnce(
				chain({ access_expires_at: new Date(Date.now() + 3600_000).toISOString() })
			);

		await notifyInvitationReceived({ authorUserId: 'guest-id', promptId: 'p1' });
		expect(sendEmailMock).toHaveBeenCalledOnce();
	});

	it('sends to a permanent member (null expiry)', async () => {
		adminFromMock
			.mockReturnValueOnce(chain(OPTED_IN_SETTINGS))
			.mockReturnValueOnce(chain({ access_expires_at: null }));

		await notifyInvitationReceived({ authorUserId: 'member-id', promptId: 'p1' });
		expect(sendEmailMock).toHaveBeenCalledOnce();
	});
});
