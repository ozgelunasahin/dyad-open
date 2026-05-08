import { json } from '@sveltejs/kit';
import { makeAdminClient } from '$lib/server/supabase-admin';
import type { RequestHandler } from './$types';

/**
 * Admin Scope detail mutation endpoint.
 *
 * - POST: grant a scope to an identity. Body: { username }.
 *   Looks up identity by username (via profiles), then inserts (or revives)
 *   identity_scopes row.
 * - PATCH: revoke or restore a grant. Body: { identity_id, revoked: boolean }.
 *
 * Lives under /admin/* and is gated by the admin hook in src/hooks.server.ts.
 */

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
	try {
		return (await request.json()) as Record<string, unknown>;
	} catch {
		return null;
	}
}

export const POST: RequestHandler = async ({ params, request }) => {
	const supabase = makeAdminClient();
	const body = await readJson(request);
	if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 });

	const { username } = body;
	if (typeof username !== 'string' || !username.trim()) {
		return json({ error: 'username is required' }, { status: 400 });
	}

	// identity_scopes.identity_id FKs to identities(id), not profiles(id).
	const { data: profile } = await supabase
		.from('profiles')
		.select('id')
		.eq('username', username.trim())
		.maybeSingle();

	if (!profile?.id) {
		return json({ error: 'No member with that username' }, { status: 404 });
	}

	const { data: identity } = await supabase
		.from('identities')
		.select('id')
		.eq('id', profile.id)
		.maybeSingle();

	if (!identity?.id) {
		return json(
			{ error: 'Member exists but has no identity row' },
			{ status: 500 }
		);
	}

	const { data: existing } = await supabase
		.from('identity_scopes')
		.select('identity_id, revoked_at')
		.eq('identity_id', identity.id)
		.eq('scope', params.scope)
		.maybeSingle();

	if (existing) {
		// Restoring a revoked grant clears revoked_at but preserves the original
		// granted_at — the cohort timestamp belongs to the first grant, not the
		// re-grant.
		const { error: dbError } = await supabase
			.from('identity_scopes')
			.update({ revoked_at: null })
			.eq('identity_id', identity.id)
			.eq('scope', params.scope);
		if (dbError) {
			console.error('[admin/scopes/[scope]/api] restore grant failed:', dbError.message);
			return json({ error: 'Failed to grant scope' }, { status: 500 });
		}
		return json({ ok: true, restored: true });
	}

	const { error: dbError } = await supabase.from('identity_scopes').insert({
		identity_id: identity.id,
		scope: params.scope,
		granted_by: null
	});

	if (dbError) {
		if (dbError.code === '23503') {
			return json({ error: 'Scope or identity not found' }, { status: 404 });
		}
		console.error('[admin/scopes/[scope]/api] grant insert failed:', dbError.message);
		return json({ error: 'Failed to grant scope' }, { status: 500 });
	}

	return json({ ok: true });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const supabase = makeAdminClient();
	const body = await readJson(request);
	if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 });

	const { identity_id, revoked } = body;
	if (typeof identity_id !== 'string') {
		return json({ error: 'identity_id is required' }, { status: 400 });
	}
	if (typeof revoked !== 'boolean') {
		return json({ error: 'revoked must be boolean' }, { status: 400 });
	}

	const { error: dbError } = await supabase
		.from('identity_scopes')
		.update({ revoked_at: revoked ? new Date().toISOString() : null })
		.eq('identity_id', identity_id)
		.eq('scope', params.scope);

	if (dbError) {
		console.error('[admin/scopes/[scope]/api] revoke failed:', dbError.message);
		return json({ error: 'Failed to update grant' }, { status: 500 });
	}

	return json({ ok: true });
};
