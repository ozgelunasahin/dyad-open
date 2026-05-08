import { json } from '@sveltejs/kit';
import { makeAdminClient } from '$lib/server/supabase-admin';
import type { RequestHandler } from './$types';

/**
 * Admin Scopes mutation endpoint.
 *
 * - POST: create a scope. Body: { scope, name, description? }.
 *   Slug must match SLUG_RE; name must be non-empty; description optional.
 * - PATCH: retire a scope (set retired_at = now()) or restore it
 *   (clear retired_at). Body: { scope, retired: boolean }.
 *
 * Lives under /admin/* and is gated by the admin hook in src/hooks.server.ts.
 * Uses service-role; bypasses RLS by design.
 *
 * created_by is null today — same pattern as invitations.invited_by, the
 * admin plane has no user identity. When operator-attribution columns ship,
 * populate from the basic-auth username.
 */

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const MAX_NAME = 100;
const MAX_DESCRIPTION = 1000;

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
	try {
		return (await request.json()) as Record<string, unknown>;
	} catch {
		return null;
	}
}

export const POST: RequestHandler = async ({ request }) => {
	const supabase = makeAdminClient();
	const body = await readJson(request);
	if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 });

	const { scope, name, description } = body;

	if (typeof scope !== 'string' || !SLUG_RE.test(scope)) {
		return json(
			{ error: 'scope must be a URL-safe slug (lowercase, digits, hyphens)' },
			{ status: 400 }
		);
	}
	if (typeof name !== 'string' || !name.trim()) {
		return json({ error: 'name is required' }, { status: 400 });
	}
	if (name.length > MAX_NAME) {
		return json({ error: `name must be at most ${MAX_NAME} characters` }, { status: 400 });
	}
	if (description !== undefined && description !== null && description !== '') {
		if (typeof description !== 'string') {
			return json({ error: 'description must be a string' }, { status: 400 });
		}
		if (description.length > MAX_DESCRIPTION) {
			return json(
				{ error: `description must be at most ${MAX_DESCRIPTION} characters` },
				{ status: 400 }
			);
		}
	}

	// created_by is nullable (relaxed in migration 20260508181100). The admin
	// plane has no user identity — admin operator authenticates via Cloudflare
	// Access at the edge, not via dyad's identities table — so we leave
	// created_by NULL when the scope is admin-created. Mirrors the
	// invitations.invited_by and identity_scopes.granted_by precedents.
	const { error: dbError } = await supabase.from('scopes').insert({
		scope: scope.trim(),
		name: name.trim(),
		description:
			typeof description === 'string' && description.trim() ? description.trim() : null,
		created_by: null
	});

	if (dbError) {
		if (dbError.code === '23505') {
			return json({ error: 'A scope with that slug already exists' }, { status: 409 });
		}
		console.error('[admin/scopes/api] create failed:', dbError.message);
		return json({ error: 'Failed to create scope' }, { status: 500 });
	}

	return json({ ok: true });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const supabase = makeAdminClient();
	const body = await readJson(request);
	if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 });

	const { scope, retired } = body;
	if (typeof scope !== 'string' || !SLUG_RE.test(scope)) {
		return json({ error: 'scope is required' }, { status: 400 });
	}
	if (typeof retired !== 'boolean') {
		return json({ error: 'retired must be boolean' }, { status: 400 });
	}

	const { error: dbError } = await supabase
		.from('scopes')
		.update({ retired_at: retired ? new Date().toISOString() : null })
		.eq('scope', scope);

	if (dbError) {
		console.error('[admin/scopes/api] retire failed:', dbError.message);
		return json({ error: 'Failed to update scope' }, { status: 500 });
	}

	return json({ ok: true });
};
