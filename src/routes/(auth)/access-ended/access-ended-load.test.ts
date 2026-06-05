import { describe, it, expect, vi } from 'vitest';
import { isRedirect } from '@sveltejs/kit';
import { load } from './+page.server.js';

// Build a chainable thenable that resolves to `{ data, error }`.
function chain(data: unknown) {
	const result = { data, error: null };
	const builder: Record<string, unknown> = {};
	for (const m of ['select', 'eq', 'maybeSingle']) builder[m] = () => builder;
	builder.then = (resolve: (v: typeof result) => unknown) => resolve(result);
	return builder;
}

function makeLocals(opts: {
	user: { id: string } | null;
	ctx?: { access_expires_at: string | null; home_scope: string | null };
	scopeName?: string;
}) {
	return {
		safeGetSession: vi.fn().mockResolvedValue({ session: null, user: opts.user }),
		supabase: {
			rpc: vi.fn().mockResolvedValue({ data: opts.ctx ? [opts.ctx] : [], error: null }),
			from: vi.fn(() => chain(opts.scopeName ? { name: opts.scopeName } : null))
		}
	};
}

async function runLoad(locals: unknown): Promise<unknown> {
	try {
		return await load({ locals } as Parameters<typeof load>[0]);
	} catch (e) {
		return e;
	}
}

const PAST = new Date(Date.now() - 3600_000).toISOString();
const FUTURE = new Date(Date.now() + 3600_000).toISOString();

describe('/access-ended load', () => {
	it('sends anonymous visitors to /login', async () => {
		const result = await runLoad(makeLocals({ user: null }));
		expect(isRedirect(result)).toBe(true);
		expect((result as { location: string }).location).toBe('/login');
	});

	it('bounces a non-expired member to /discover (no dead end on direct navigation)', async () => {
		const result = await runLoad(
			makeLocals({
				user: { id: 'u1' },
				ctx: { access_expires_at: FUTURE, home_scope: null }
			})
		);
		expect(isRedirect(result)).toBe(true);
		expect((result as { location: string }).location).toBe('/discover');
	});

	it('bounces a permanent member (null expiry) to /discover', async () => {
		const result = await runLoad(
			makeLocals({
				user: { id: 'u1' },
				ctx: { access_expires_at: null, home_scope: null }
			})
		);
		expect(isRedirect(result)).toBe(true);
		expect((result as { location: string }).location).toBe('/discover');
	});

	it('renders the corner name for an expired guest', async () => {
		const result = await runLoad(
			makeLocals({
				user: { id: 'u1' },
				ctx: { access_expires_at: PAST, home_scope: 'conf-corner' },
				scopeName: 'Public Spaces'
			})
		);
		expect(result).toEqual({ cornerName: 'Public Spaces' });
	});
});
