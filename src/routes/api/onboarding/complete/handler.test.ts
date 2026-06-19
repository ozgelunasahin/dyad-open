import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';

/** Minimal RequestEvent stub — POST only touches locals. */
function makeEvent(opts: { user: unknown; rpcError?: { message: string } | null }) {
	return {
		locals: {
			safeGetSession: vi.fn().mockResolvedValue({ user: opts.user }),
			supabase: { rpc: vi.fn().mockResolvedValue({ error: opts.rpcError ?? null }) }
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

describe('POST /api/onboarding/complete', () => {
	it('returns 401 when unauthenticated and never calls the rpc', async () => {
		const event = makeEvent({ user: null });
		const res = await POST(event);
		expect(res.status).toBe(401);
		expect(event.locals.supabase.rpc).not.toHaveBeenCalled();
	});

	it('calls mark_self_onboarded and returns ok for an authenticated user', async () => {
		const event = makeEvent({ user: { id: 'u1' } });
		const res = await POST(event);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
		expect(event.locals.supabase.rpc).toHaveBeenCalledWith('mark_self_onboarded');
	});

	it('returns a generic 500 (no internal detail) when the rpc fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const res = await POST(makeEvent({ user: { id: 'u1' }, rpcError: { message: 'pg: relation boom' } }));
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBe('Failed to complete onboarding');
		expect(JSON.stringify(body)).not.toContain('boom');
	});
});
