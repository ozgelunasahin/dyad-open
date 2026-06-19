import { describe, it, expect, beforeEach, vi } from 'vitest';

// loadLayoutData wraps the upact port only to derive `identity`; stub it so the
// test exercises the loader logic, not the substrate.
vi.mock('@prefig/upact-supabase', () => ({
	userToUpactor: (u: { id: string }) => ({ id: u.id })
}));

const { loadLayoutData } = await import('./load-layout-data.js');

// A chainable thenable that resolves to a Supabase-style result object
// (`{ data, error }` or `{ count, error }`), mirroring the helper in
// notification-expiry-guard.test.ts.
function chain(result: unknown) {
	const builder: Record<string, unknown> = {};
	for (const m of ['select', 'eq', 'single', 'maybeSingle']) builder[m] = () => builder;
	builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
	return builder;
}

// supabase.from() is called in array order: profiles, prompt_invitations,
// feedback_forms, group_feedback, notification_settings. (No pendingFeedbackFormId,
// so loadPendingFeedback is skipped and issues no extra `from` calls.)
function makeLocals(notifResult: unknown) {
	const from = vi.fn();
	from
		.mockReturnValueOnce(chain({ data: { username: 'mara' }, error: null })) // profiles
		.mockReturnValueOnce(chain({ count: 0, error: null })) // prompt_invitations
		.mockReturnValueOnce(chain({ count: 0, error: null })) // feedback_forms
		.mockReturnValueOnce(chain({ count: 0, error: null })) // group_feedback
		.mockReturnValueOnce(chain(notifResult)); // notification_settings
	return { user: { id: 'u1' }, supabase: { from } } as unknown as App.Locals;
}

describe('loadLayoutData — hasNotificationEmail (U1)', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('is true when the member has a notification address', async () => {
		const data = await loadLayoutData(makeLocals({ data: { email: 'guest@example.org' }, error: null }));
		expect(data.hasNotificationEmail).toBe(true);
	});

	it('is false when the stored email is null', async () => {
		const data = await loadLayoutData(makeLocals({ data: { email: null }, error: null }));
		expect(data.hasNotificationEmail).toBe(false);
	});

	it('is false when there is no notification_settings row', async () => {
		const data = await loadLayoutData(makeLocals({ data: null, error: null }));
		expect(data.hasNotificationEmail).toBe(false);
	});

	it('is false for an empty-string email', async () => {
		const data = await loadLayoutData(makeLocals({ data: { email: '' }, error: null }));
		expect(data.hasNotificationEmail).toBe(false);
	});

	it('fails safe to true (and logs) when the read errors', async () => {
		const data = await loadLayoutData(makeLocals({ data: null, error: { message: 'boom' } }));
		expect(data.hasNotificationEmail).toBe(true);
		expect(console.error).toHaveBeenCalled();
	});

	it('leaves the existing layout fields intact', async () => {
		const data = await loadLayoutData(makeLocals({ data: { email: 'guest@example.org' }, error: null }));
		expect(data.username).toBe('mara');
		expect(data.attentionCount).toBe(0);
		expect(data.pendingFeedback).toBeNull();
		expect(data.identity).toEqual({ id: 'u1' });
	});
});
