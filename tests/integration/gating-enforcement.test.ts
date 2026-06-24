import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, createAuthenticatedClient, TEST_USERS, SEED_PROMPTS } from '../helpers/auth.js';

/**
 * Per-action gating enforcement at the data layer: the split RLS FOR INSERT
 * policies and the accept_invitation RPC body. (The endpoint-primary gate is
 * unit-tested in src/lib/server/require-membership.test.ts.)
 *
 * lisa is made a comp (active) member; marco stays an inactive guest. The seed
 * pending invitation b0000001 has marco as invitee — the RPC gate RAISEs before
 * any mutation, so the denied path leaves seed state untouched.
 */
const SEED_PENDING_INVITATION = 'b0000001-0000-0000-0000-000000000001';
const LISA = TEST_USERS.lisa.id;
const MARCO = TEST_USERS.marco.id;

describe('membership gating enforcement (RLS + accept RPC)', () => {
	const admin = createAdminClient();
	let lisa: SupabaseClient;
	let marco: SupabaseClient;
	const createdPromptIds: string[] = [];

	async function setGating(gating: Record<string, boolean>) {
		await admin
			.from('app_settings')
			.upsert(
				{ key: 'membership_gating', value: gating, updated_at: new Date().toISOString() },
				{ onConflict: 'key' }
			);
	}
	async function clearGating() {
		await admin.from('app_settings').delete().eq('key', 'membership_gating');
	}

	beforeAll(async () => {
		[lisa, marco] = await Promise.all([
			createAuthenticatedClient(TEST_USERS.lisa.email, TEST_USERS.lisa.password),
			createAuthenticatedClient(TEST_USERS.marco.email, TEST_USERS.marco.password)
		]);
		await admin.from('memberships').delete().in('identity_id', [LISA, MARCO]);
		await admin.from('memberships').insert({ identity_id: LISA, source: 'comp', active: true });
	});

	beforeEach(clearGating);

	afterAll(async () => {
		await clearGating();
		await admin.from('memberships').delete().in('identity_id', [LISA, MARCO]);
		if (createdPromptIds.length) await admin.from('prompts').delete().in('id', createdPromptIds);
		await admin
			.from('prompt_comments')
			.delete()
			.eq('author_id', MARCO)
			.eq('prompt_id', SEED_PROMPTS.published);
	});

	it('reads are never gated — an inactive guest lists published conversations under full gating (AE3/R11)', async () => {
		await setGating({ create_conversation: true, respond_take_slot: true, invite_to_meet: true });
		const { data, error } = await marco
			.from('prompts')
			.select('id')
			.eq('state', 'published')
			.limit(5);
		expect(error, error?.message).toBeNull();
		expect(data?.length ?? 0).toBeGreaterThan(0);
	});

	it('create_conversation gated → inactive guest INSERT rejected, active comp member allowed (AE4)', async () => {
		await setGating({ create_conversation: true });

		const denied = await marco.from('prompts').insert({ id: `gate-marco-${Date.now()}`, author_id: MARCO });
		expect(denied.error, 'RLS FOR INSERT must reject an inactive guest').not.toBeNull();

		const lisaId = `gate-lisa-${Date.now()}`;
		createdPromptIds.push(lisaId);
		const allowed = await lisa.from('prompts').insert({ id: lisaId, author_id: LISA });
		expect(allowed.error, allowed.error?.message).toBeNull(); // comp == paid at the gate
	});

	it('gating off → inactive guest can create (no behaviour change)', async () => {
		const id = `gate-off-${Date.now()}`;
		createdPromptIds.push(id);
		const { error } = await marco.from('prompts').insert({ id, author_id: MARCO });
		expect(error, error?.message).toBeNull();
	});

	it('per-action independence — respond gated, create off (AE2)', async () => {
		await setGating({ respond_take_slot: true });

		const id = `gate-indep-${Date.now()}`;
		createdPromptIds.push(id);
		const createRes = await marco.from('prompts').insert({ id, author_id: MARCO });
		expect(createRes.error, 'create_conversation is off → allowed').toBeNull();

		const commentRes = await marco
			.from('prompt_comments')
			.insert({ prompt_id: SEED_PROMPTS.published, author_id: MARCO, body: 'gate test' });
		expect(commentRes.error, 'respond_take_slot is on → rejected').not.toBeNull();
	});

	it('respond gated → inactive guest cannot accept an invitation (accept_invitation RPC gate)', async () => {
		await setGating({ respond_take_slot: true });
		// marco is the invitee; the gate RAISEs before any write, so the seed
		// invitation stays pending.
		const { error } = await marco.rpc('accept_invitation', {
			p_invitation_id: SEED_PENDING_INVITATION
		});
		expect(error).not.toBeNull();
		expect(error?.message ?? '').toContain('membership_required');
	});
});
