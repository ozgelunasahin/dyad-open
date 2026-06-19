import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEnv, syncContactSegment, removeFromAllSegments, resendSegmentsConfigured, rpc, getUserById } =
	vi.hoisted(() => ({
		mockEnv: {} as Record<string, string | undefined>,
		syncContactSegment: vi.fn(),
		removeFromAllSegments: vi.fn(),
		resendSegmentsConfigured: vi.fn(),
		rpc: vi.fn(),
		getUserById: vi.fn()
	}));

vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));
vi.mock('$lib/server/supabase-admin', () => ({
	makeAdminClient: () => ({ rpc, auth: { admin: { getUserById } } })
}));
vi.mock('$lib/server/resend-segments', () => ({
	syncContactSegment,
	removeFromAllSegments,
	resendSegmentsConfigured,
	ALL_SEGMENTS: ['waitlist', 'invited', 'member']
}));

const { POST } = await import('./+server.js');

function event(body: unknown, headers: Record<string, string> = {}) {
	return {
		request: { headers: new Headers(headers), json: async () => body }
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

const SECRET = { 'x-webhook-secret': 'sek' };
const contactsBody = { type: 'INSERT', table: 'contacts', record: { email: 'a@b.com' }, old_record: null };

describe('POST /api/webhooks/resend-sync', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		for (const k of Object.keys(mockEnv)) delete mockEnv[k];
		mockEnv.RESEND_SYNC_SECRET = 'sek';
		rpc.mockReset().mockResolvedValue({ data: 'invited', error: null });
		getUserById.mockReset().mockResolvedValue({ data: { user: { email: 'a@b.com' } }, error: null });
		syncContactSegment.mockReset().mockResolvedValue(true);
		removeFromAllSegments.mockReset().mockResolvedValue(true);
		resendSegmentsConfigured.mockReset().mockReturnValue(true);
	});

	it('503 when the secret is not configured', async () => {
		delete mockEnv.RESEND_SYNC_SECRET;
		const res = await POST(event(contactsBody, SECRET));
		expect(res.status).toBe(503);
	});

	it('401 on a wrong secret', async () => {
		const res = await POST(event(contactsBody, { 'x-webhook-secret': 'nope' }));
		expect(res.status).toBe(401);
	});

	it('400 on an invalid payload shape', async () => {
		const res = await POST(event({ type: 'INSERT' /* no table */ }, SECRET));
		expect(res.status).toBe(400);
	});

	it('no-ops with 200 when Resend is unconfigured', async () => {
		resendSegmentsConfigured.mockReturnValue(false);
		const res = await POST(event(contactsBody, SECRET));
		expect(res.status).toBe(200);
		expect(syncContactSegment).not.toHaveBeenCalled();
	});

	it('reconciles a contacts row and never echoes the email', async () => {
		const res = await POST(event(contactsBody, SECRET));
		expect(res.status).toBe(200);
		expect(rpc).toHaveBeenCalledWith('contact_segment', { p_email: 'a@b.com' });
		expect(syncContactSegment).toHaveBeenCalledWith('a@b.com', 'invited');
		expect(JSON.stringify(await res.json())).not.toContain('a@b.com');
	});

	it('removes from all segments when the email is unknown (segment null)', async () => {
		rpc.mockResolvedValue({ data: null, error: null });
		const res = await POST(event(contactsBody, SECRET));
		expect(res.status).toBe(200);
		expect(removeFromAllSegments).toHaveBeenCalledWith('a@b.com');
		expect(syncContactSegment).not.toHaveBeenCalled();
	});

	it('500 when the segment RPC fails (so Supabase retries)', async () => {
		rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
		const res = await POST(event(contactsBody, SECRET));
		expect(res.status).toBe(500);
		expect(JSON.stringify(await res.json())).not.toContain('boom');
	});

	it('500 when the Resend reconcile does not fully succeed', async () => {
		syncContactSegment.mockResolvedValue(false);
		const res = await POST(event(contactsBody, SECRET));
		expect(res.status).toBe(500);
	});

	it('resolves the email from a profiles row via the auth admin API', async () => {
		const res = await POST(
			event({ type: 'UPDATE', table: 'profiles', record: { id: 'u1' }, old_record: null }, SECRET)
		);
		expect(getUserById).toHaveBeenCalledWith('u1');
		expect(syncContactSegment).toHaveBeenCalledWith('a@b.com', 'invited');
		expect(res.status).toBe(200);
	});
});
