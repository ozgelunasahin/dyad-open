import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isRedirect } from '@sveltejs/kit';

// Mock dependencies before importing the actions.
const adminFromMock = vi.fn();
const adminRpcMock = vi.fn();
const createUserMock = vi.fn();
const deleteUserMock = vi.fn();
vi.mock('$lib/server/supabase-admin.js', () => ({
	makeAdminClient: () => ({
		from: adminFromMock,
		rpc: adminRpcMock,
		auth: { admin: { createUser: createUserMock, deleteUser: deleteUserMock } }
	})
}));

const autoGrantMock = vi.fn();
vi.mock('$lib/services/scope.js', () => ({
	SupabaseScopeService: class {
		autoGrantOnJoin = autoGrantMock;
	}
}));

const { actions } = await import('./+page.server.js');

// Build a chainable thenable that resolves to `{ data, error }`.
function chain(data: unknown, dbError: unknown = null) {
	const result = { data, error: dbError };
	const builder: Record<string, unknown> = {};
	const methods = ['select', 'eq', 'maybeSingle', 'update', 'delete', 'single'];
	for (const m of methods) builder[m] = () => builder;
	builder.then = (resolve: (v: typeof result) => unknown) => resolve(result);
	return builder;
}

let ipCounter = 0;

function makeEvent(fields: Record<string, string>, ip?: string) {
	const formData = new FormData();
	for (const [k, v] of Object.entries(fields)) formData.set(k, v);
	const request = new Request('http://localhost/join?glink=tok', {
		method: 'POST',
		// Distinct IP per event by default so the in-memory rate limiter never
		// couples unrelated tests.
		headers: { 'cf-connecting-ip': ip ?? `10.0.0.${++ipCounter}` },
		body: formData
	});
	const signInMock = vi.fn().mockResolvedValue({ error: null });
	return {
		event: {
			request,
			locals: { supabase: { auth: { signInWithPassword: signInMock } } },
			getClientAddress: () => ip ?? '127.0.0.1'
		},
		signInMock
	};
}

const VALID_FIELDS = {
	glink: 'tok',
	username: 'attendee',
	email: 'attendee@example.org',
	// Documented local fixture (gitleaks-allowlisted), not a real credential.
	password: 'local-fixture-not-a-secret'
};

function mockHappyAdmin() {
	// Call order: profiles username check (parallel with rpc email check) →
	// rpc redeem → profiles stamp update.
	adminFromMock
		.mockReturnValueOnce(chain(null)) // username free
		.mockReturnValueOnce(chain(null)); // stamp update ok
	adminRpcMock.mockImplementation(async (name: string) => {
		if (name === 'email_is_registered') return { data: false, error: null };
		if (name === 'redeem_group_invite_link')
			return {
				data: [{ scope: 'conf-corner', access_expires_at: '2026-06-08T16:00:00Z' }],
				error: null
			};
		if (name === 'release_group_invite_redemption') return { data: null, error: null };
		return { data: null, error: { message: `unexpected rpc ${name}` } };
	});
	createUserMock.mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null });
	autoGrantMock.mockResolvedValue(undefined);
}

function rpcCallNames(): string[] {
	return adminRpcMock.mock.calls.map((c) => c[0] as string);
}

describe('groupJoin action', () => {
	beforeEach(() => {
		adminFromMock.mockReset();
		adminRpcMock.mockReset();
		createUserMock.mockReset();
		deleteUserMock.mockReset();
		autoGrantMock.mockReset();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('happy path: redeems, creates, grants, stamps, redirects to /discover without welcome', async () => {
		mockHappyAdmin();
		const { event, signInMock } = makeEvent(VALID_FIELDS);

		let redirected: unknown = null;
		try {
			await actions.groupJoin(event as never);
		} catch (e) {
			redirected = e;
		}

		expect(isRedirect(redirected)).toBe(true);
		expect((redirected as { location: string }).location).toBe('/discover');
		expect(createUserMock).toHaveBeenCalledOnce();
		const createArgs = createUserMock.mock.calls[0][0];
		expect(createArgs.user_metadata.berlin_based).toBe(false);
		expect(autoGrantMock).toHaveBeenCalledWith({
			identityId: 'new-user-id',
			scope: 'conf-corner',
			grantedBy: null
		});
		expect(signInMock).toHaveBeenCalledOnce();
	});

	it('taken username fails before any redemption (no cap burn)', async () => {
		adminFromMock.mockReturnValueOnce(chain({ username: 'attendee' }));
		adminRpcMock.mockResolvedValueOnce({ data: false, error: null }); // parallel email check
		const { event } = makeEvent(VALID_FIELDS);

		const result = await actions.groupJoin(event as never);
		expect(result?.status).toBe(400);
		// The email pre-check runs in parallel, but the redemption never fires.
		expect(rpcCallNames()).not.toContain('redeem_group_invite_link');
	});

	it('registered email fails before any redemption with log-in guidance', async () => {
		adminFromMock.mockReturnValueOnce(chain(null));
		adminRpcMock.mockResolvedValueOnce({ data: true, error: null }); // email_is_registered

		const { event } = makeEvent(VALID_FIELDS);
		const result = await actions.groupJoin(event as never);

		expect(result?.status).toBe(400);
		expect(result?.data?.error).toContain('Log in instead');
		expect(rpcCallNames()).toEqual(['email_is_registered']);
		expect(createUserMock).not.toHaveBeenCalled();
	});

	it('maps redemption failures to distinct friendly errors without creating a user', async () => {
		for (const [token, fragment] of [
			['group_link_full', 'full'],
			['group_link_closed', 'closed'],
			['group_link_revoked', 'no longer available'],
			['group_link_not_found', "isn't valid"]
		] as const) {
			adminFromMock.mockReturnValueOnce(chain(null));
			adminRpcMock
				.mockResolvedValueOnce({ data: false, error: null }) // email check
				.mockResolvedValueOnce({ data: null, error: { message: token } }); // redeem

			const { event } = makeEvent(VALID_FIELDS);
			const result = await actions.groupJoin(event as never);
			expect(result?.status).toBe(400);
			expect(result?.data?.error?.toLowerCase()).toContain(fragment);
			expect(createUserMock).not.toHaveBeenCalled();
			adminFromMock.mockReset();
			adminRpcMock.mockReset();
		}
	});

	it('compensates with account deletion and releases the cap slot when grant/stamp fails', async () => {
		mockHappyAdmin();
		autoGrantMock.mockRejectedValueOnce(new Error('insert failed'));
		// Compensating path: profiles delete → identities delete.
		adminFromMock
			.mockReset()
			.mockReturnValueOnce(chain(null)) // username free
			.mockReturnValueOnce(chain(null)) // profiles delete
			.mockReturnValueOnce(chain(null)); // identities delete
		deleteUserMock.mockResolvedValue({ data: null, error: null });

		const { event } = makeEvent(VALID_FIELDS);
		const result = await actions.groupJoin(event as never);

		expect(result?.status).toBe(500);
		expect(deleteUserMock).toHaveBeenCalledWith('new-user-id');
		expect(rpcCallNames()).toContain('release_group_invite_redemption');
	});

	it('releases the cap slot when createUser fails after a successful redeem', async () => {
		mockHappyAdmin();
		createUserMock.mockResolvedValueOnce({
			data: { user: null },
			error: { message: 'database error creating user' }
		});

		const { event } = makeEvent(VALID_FIELDS);
		const result = await actions.groupJoin(event as never);

		expect(result?.status).toBe(400);
		expect(rpcCallNames()).toContain('release_group_invite_redemption');
		expect(autoGrantMock).not.toHaveBeenCalled();
	});

	it('rejects an over-length password before touching the database', async () => {
		const { event } = makeEvent({ ...VALID_FIELDS, password: 'x'.repeat(129) });
		const result = await actions.groupJoin(event as never);
		expect(result?.status).toBe(400);
		expect(adminFromMock).not.toHaveBeenCalled();
	});

	it('falls back to a success message (no redirect) when auto-sign-in fails', async () => {
		mockHappyAdmin();
		const { event, signInMock } = makeEvent(VALID_FIELDS);
		signInMock.mockResolvedValueOnce({ error: { message: 'Email not confirmed' } });

		const result = await actions.groupJoin(event as never);
		expect(result?.success).toBe(true);
		expect(result?.message).toBeTruthy();
	});

	it('rejects invalid email shapes before touching the database', async () => {
		const { event } = makeEvent({ ...VALID_FIELDS, email: 'not-an-email' });
		const result = await actions.groupJoin(event as never);
		expect(result?.status).toBe(400);
		expect(adminFromMock).not.toHaveBeenCalled();
	});

	it('rate-limits repeated attempts from one IP', async () => {
		const ip = '198.51.100.7';
		adminRpcMock.mockResolvedValue({ data: false, error: null }); // parallel email check
		let lastResult: { status?: number } | undefined;
		for (let i = 0; i < 6; i++) {
			adminFromMock.mockReturnValueOnce(chain({ username: 'attendee' })); // fail cheap
			const { event } = makeEvent(VALID_FIELDS, ip);
			lastResult = (await actions.groupJoin(event as never)) as { status?: number };
		}
		expect(lastResult?.status).toBe(429);
	});
});
