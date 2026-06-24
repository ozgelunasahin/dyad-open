import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

const { sendEmailMock, killSwitch, adminFromMock } = vi.hoisted(() => ({
	sendEmailMock: vi.fn().mockResolvedValue(true),
	killSwitch: vi.fn().mockResolvedValue(true),
	adminFromMock: vi.fn()
}));

vi.mock('./email.js', () => ({ sendEmail: sendEmailMock }));
vi.mock('./app-settings.js', () => ({ getEmailNotificationsEnabled: killSwitch }));
vi.mock('./supabase-admin.js', () => ({ makeAdminClient: () => ({ from: adminFromMock }) }));

const { notifyMembershipActivated } = await import('./notification-emails.js');

function chain(data: unknown) {
	const result = { data, error: null };
	const builder: Record<string, unknown> = {};
	for (const m of ['select', 'eq', 'maybeSingle']) builder[m] = () => builder;
	builder.then = (resolve: (v: typeof result) => unknown) => resolve(result);
	return builder;
}

describe('notifyMembershipActivated — best-effort welcome', () => {
	beforeEach(() => {
		sendEmailMock.mockClear();
		adminFromMock.mockReset();
		killSwitch.mockReset().mockResolvedValue(true);
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('sends when the kill switch is on and the member has opted in', async () => {
		adminFromMock
			.mockReturnValueOnce(chain({ email: 'm@example.org' })) // notification_settings
			.mockReturnValueOnce(chain({ access_expires_at: null })); // profiles

		await notifyMembershipActivated({ userId: 'm1' });
		expect(sendEmailMock).toHaveBeenCalledOnce();
		expect(sendEmailMock.mock.calls[0][0].subject).toBe('Your membership is active');
	});

	it('does not send when the global kill switch is off', async () => {
		killSwitch.mockResolvedValue(false);
		await notifyMembershipActivated({ userId: 'm1' });
		expect(sendEmailMock).not.toHaveBeenCalled();
	});

	it('does not send when the member has no opt-in address', async () => {
		adminFromMock.mockReturnValueOnce(chain({ email: null }));
		await notifyMembershipActivated({ userId: 'm1' });
		expect(sendEmailMock).not.toHaveBeenCalled();
	});

	it('sends regardless of per-event prefs (no membership pref flag to gate on)', async () => {
		adminFromMock
			.mockReturnValueOnce(
				chain({
					email: 'm@example.org',
					invitation_received: false,
					invitation_answered: false,
					meeting_cancelled: false
				})
			)
			.mockReturnValueOnce(chain({ access_expires_at: null }));

		await notifyMembershipActivated({ userId: 'm1' });
		expect(sendEmailMock).toHaveBeenCalledOnce();
	});
});
