import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getMembershipGating } = vi.hoisted(() => ({ getMembershipGating: vi.fn() }));
vi.mock('$lib/server/app-settings', () => ({ getMembershipGating }));

const { requireMembershipForAction } = await import('./require-membership.js');

interface LocalsOpts {
	user?: { id: string } | null;
	row?: { active: boolean } | null;
	readError?: { message: string } | null;
}

function makeLocals(opts: LocalsOpts) {
	return {
		user: opts.user === undefined ? { id: 'actor-1' } : opts.user,
		supabase: {
			from: () => ({
				select: () => ({
					eq: () => ({
						maybeSingle: async () => ({ data: opts.row ?? null, error: opts.readError ?? null })
					})
				})
			})
		}
	} as unknown as App.Locals;
}

describe('requireMembershipForAction', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		getMembershipGating.mockReset().mockResolvedValue({ create_conversation: true });
	});

	it('allows when the action is not gated', async () => {
		getMembershipGating.mockResolvedValue({ respond_take_slot: true }); // create off
		expect(await requireMembershipForAction('create_conversation', makeLocals({}))).toBeNull();
	});

	it('allows an active member', async () => {
		const res = await requireMembershipForAction('create_conversation', makeLocals({ row: { active: true } }));
		expect(res).toBeNull();
	});

	it('403s an inactive (lapsed) member with had_membership:true', async () => {
		const res = await requireMembershipForAction('create_conversation', makeLocals({ row: { active: false } }));
		expect(res?.status).toBe(403);
		expect(await res?.json()).toEqual({
			error: 'membership_required',
			action: 'create_conversation',
			had_membership: true
		});
	});

	it('403s a never-member guest with had_membership:false', async () => {
		const res = await requireMembershipForAction('create_conversation', makeLocals({ row: null }));
		expect(res?.status).toBe(403);
		expect(await res?.json()).toMatchObject({ error: 'membership_required', had_membership: false });
	});

	it('fails open (allows) on a membership read error', async () => {
		const res = await requireMembershipForAction(
			'create_conversation',
			makeLocals({ readError: { message: 'pg down' } })
		);
		expect(res).toBeNull();
	});

	it('fails open (allows) when the gating config read throws', async () => {
		getMembershipGating.mockRejectedValue(new Error('settings down'));
		expect(await requireMembershipForAction('create_conversation', makeLocals({}))).toBeNull();
	});

	it('throws 401 when unauthenticated', async () => {
		await expect(
			requireMembershipForAction('create_conversation', makeLocals({ user: null }))
		).rejects.toMatchObject({ status: 401 });
	});
});
