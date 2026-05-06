import { json } from '@sveltejs/kit';
import { makeAdminClient } from '$lib/server/supabase-admin';
import type { RequestHandler } from './$types';

/**
 * Admin-plane endpoint for toggling a conversation's discovery visibility.
 *
 * Lives under /admin/* and is gated by the admin auth hook in
 * src/hooks.server.ts (Cloudflare Access JWT verification + the dev bypass).
 * Uses the service-role Supabase client — no user identity is involved.
 *
 * POST body: { id: string, action: 'hide' | 'unhide' }
 * Response: { ok: true, hidden_at: string | null } on success
 *
 * Hiding sets `prompts.hidden_at = NOW()`. Unhiding clears it. The action
 * is idempotent — re-hiding refreshes the timestamp; re-unhiding is a
 * no-op. Hide does not break direct URL access for invitees, responders,
 * or meeting participants — see migration 20260506130000.
 */
export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	if (typeof body !== 'object' || body === null) {
		return json({ error: 'Body must be an object' }, { status: 400 });
	}

	const { id, action } = body as { id?: unknown; action?: unknown };

	if (typeof id !== 'string' || id.length === 0) {
		return json({ error: 'id is required' }, { status: 400 });
	}

	if (action !== 'hide' && action !== 'unhide') {
		return json({ error: "action must be 'hide' or 'unhide'" }, { status: 400 });
	}

	const supabase = makeAdminClient();
	const nextHiddenAt = action === 'hide' ? new Date().toISOString() : null;

	const { data, error: updateError } = await supabase
		.from('prompts')
		.update({ hidden_at: nextHiddenAt })
		.eq('id', id)
		.select('id, hidden_at')
		.single();

	if (updateError) {
		// Postgres "Results contain 0 rows" returns code PGRST116 from PostgREST.
		if (updateError.code === 'PGRST116') {
			return json({ error: 'Conversation not found' }, { status: 404 });
		}
		console.error('[admin/conversations] update failed', updateError);
		return json({ error: 'Operation failed' }, { status: 500 });
	}

	return json({ ok: true, hidden_at: data?.hidden_at ?? null });
};
