import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseMembershipService } from './membership.js';

interface MockOpts {
	selectRow?: Record<string, unknown> | null;
	selectError?: { message: string } | null;
	upsertError?: { message: string } | null;
}

let captured: { arg?: Record<string, unknown>; onConflict?: string } = {};

function mockClient(opts: MockOpts): SupabaseClient {
	return {
		from() {
			return {
				select() {
					return this;
				},
				eq() {
					return this;
				},
				async maybeSingle() {
					return { data: opts.selectRow ?? null, error: opts.selectError ?? null };
				},
				async upsert(arg: Record<string, unknown>, options?: { onConflict?: string }) {
					captured = { arg, onConflict: options?.onConflict };
					return { error: opts.upsertError ?? null };
				}
			};
		}
	} as unknown as SupabaseClient;
}

describe('SupabaseMembershipService', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		captured = {};
	});

	it('getMembership returns the actor row', async () => {
		const svc = new SupabaseMembershipService(
			mockClient({ selectRow: { identity_id: 'u1', active: true, source: 'paid' } })
		);
		expect(await svc.getMembership('u1')).toMatchObject({ identity_id: 'u1', active: true });
	});

	it('getMembership returns null (does not throw) on a read error', async () => {
		const svc = new SupabaseMembershipService(mockClient({ selectError: { message: 'db down' } }));
		expect(await svc.getMembership('u1')).toBeNull();
	});

	it('isActive: true for an active row, false for no row, false on error', async () => {
		expect(
			await new SupabaseMembershipService(mockClient({ selectRow: { active: true } })).isActive('u1')
		).toBe(true);
		expect(
			await new SupabaseMembershipService(mockClient({ selectRow: null })).isActive('u1')
		).toBe(false);
		expect(
			await new SupabaseMembershipService(mockClient({ selectError: { message: 'x' } })).isActive(
				'u1'
			)
		).toBe(false);
	});

	it('upsertMembership upserts on identity_id and stamps updated_at', async () => {
		const svc = new SupabaseMembershipService(mockClient({}));
		await svc.upsertMembership({ identity_id: 'u1', source: 'paid', active: true });
		expect(captured.onConflict).toBe('identity_id');
		expect(captured.arg).toMatchObject({ identity_id: 'u1', source: 'paid', active: true });
		expect(typeof captured.arg?.updated_at).toBe('string');
	});

	it('upsertMembership throws on a write error so the webhook retries', async () => {
		const svc = new SupabaseMembershipService(mockClient({ upsertError: { message: 'conflict' } }));
		await expect(
			svc.upsertMembership({ identity_id: 'u1', source: 'paid', active: true })
		).rejects.toThrow(/membership upsert failed/);
	});
});
