import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseMembershipService } from './membership.js';

interface MockOpts {
	selectRow?: Record<string, unknown> | null;
	selectError?: { message: string } | null;
	upsertError?: { message: string } | null;
	updateError?: { message: string } | null;
}

let captured: {
	upsertArg?: Record<string, unknown>;
	onConflict?: string;
	updateArg?: Record<string, unknown>;
} = {};

function mockClient(opts: MockOpts): SupabaseClient {
	return {
		from() {
			const builder = {
				select: () => builder,
				eq: () => builder,
				maybeSingle: async () => ({ data: opts.selectRow ?? null, error: opts.selectError ?? null }),
				upsert: async (arg: Record<string, unknown>, options?: { onConflict?: string }) => {
					captured.upsertArg = arg;
					captured.onConflict = options?.onConflict;
					return { error: opts.upsertError ?? null };
				},
				update: (arg: Record<string, unknown>) => {
					captured.updateArg = arg;
					return builder;
				},
				// update().eq() is awaited for its {error}: make the builder thenable.
				then: (onF: (v: { error: unknown }) => unknown) =>
					Promise.resolve({ error: opts.updateError ?? null }).then(onF)
			};
			return builder;
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
		expect(captured.upsertArg).toMatchObject({ identity_id: 'u1', source: 'paid', active: true });
		expect(typeof captured.upsertArg?.updated_at).toBe('string');
	});

	it('upsertMembership throws on a write error', async () => {
		const svc = new SupabaseMembershipService(mockClient({ upsertError: { message: 'conflict' } }));
		await expect(
			svc.upsertMembership({ identity_id: 'u1', source: 'paid', active: true })
		).rejects.toThrow(/membership upsert failed/);
	});

	it('updateMembership patches only the given fields (no NOT NULL source needed)', async () => {
		const svc = new SupabaseMembershipService(mockClient({}));
		await svc.updateMembership('u1', { active: false });
		expect(captured.updateArg).toEqual({ active: false });
	});

	it('updateMembership throws on a write error so the webhook retries', async () => {
		const svc = new SupabaseMembershipService(mockClient({ updateError: { message: 'boom' } }));
		await expect(svc.updateMembership('u1', { active: false })).rejects.toThrow(
			/membership update failed/
		);
	});
});
