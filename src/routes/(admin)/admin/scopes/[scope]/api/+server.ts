import { json } from '@sveltejs/kit';
import { makeAdminClient } from '$lib/server/supabase-admin';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { REGIONS } from '$lib/services/location.js';
import type { RequestHandler } from './$types';

/**
 * Admin Scope detail mutation endpoint.
 *
 * - POST: grant a scope to an identity. Body: { username }.
 *   Looks up identity by username (via profiles), then inserts (or revives)
 *   identity_scopes row.
 * - PATCH: discriminated by body shape:
 *     { identity_id, revoked: boolean }                — revoke/restore a grant
 *     { action: 'extend', identity_id, access_expires_at } — move one guest's window
 *     { action: 'extend_all_guests', access_expires_at }   — move every guest of this corner
 *     { action: 'convert', identity_id }               — guest → permanent member
 *     { action: 'set_region', region: string | null }  — set/clear the corner's region
 *       (post-hoc: corners created before regions existed, e.g. a prod stub)
 *
 * Guest mutations write profiles via the service-role client and constrain
 * the TARGET (home_scope = this corner), not just the verb — a member who is
 * not a guest of this corner cannot be stamped through this endpoint.
 * Convert clears access_expires_at + home_scope and keeps the grant; the
 * member becomes a regular commons member.
 *
 * Lives under /admin/* and is gated by the admin hook in src/hooks.server.ts.
 */

export const POST: RequestHandler = async ({ params, request }) => {
	const supabase = makeAdminClient();
	const [body, errorResponse] = await parseJsonBody(request);
	if (errorResponse) return errorResponse;

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

function parseFutureTimestamp(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const d = new Date(value);
	if (isNaN(d.getTime()) || d.getTime() <= Date.now()) return null;
	return d.toISOString();
}

export const PATCH: RequestHandler = async ({ params, request }) => {
	const supabase = makeAdminClient();
	const [body, errorResponse] = await parseJsonBody(request);
	if (errorResponse) return errorResponse;

	const { action } = body;

	if (action === 'extend') {
		const { identity_id } = body;
		if (typeof identity_id !== 'string') {
			return json({ error: 'identity_id is required' }, { status: 400 });
		}
		const newExpiry = parseFutureTimestamp(body.access_expires_at);
		if (!newExpiry) {
			return json({ error: 'access_expires_at must be a future timestamp' }, { status: 400 });
		}
		const { data: updated, error: dbError } = await supabase
			.from('profiles')
			.update({ access_expires_at: newExpiry })
			.eq('id', identity_id)
			.eq('home_scope', params.scope)
			.select('id');
		if (dbError) {
			console.error('[admin/scopes/[scope]/api] extend failed:', dbError.message);
			return json({ error: 'Failed to extend access' }, { status: 500 });
		}
		if (!updated || updated.length === 0) {
			return json({ error: 'No guest of this corner with that identity' }, { status: 404 });
		}
		return json({ ok: true });
	}

	if (action === 'extend_all_guests') {
		const newExpiry = parseFutureTimestamp(body.access_expires_at);
		if (!newExpiry) {
			return json({ error: 'access_expires_at must be a future timestamp' }, { status: 400 });
		}
		// Only guests of THIS corner move — a member with a grant but no
		// home_scope (or another corner's guest) is untouched.
		const { data: updated, error: dbError } = await supabase
			.from('profiles')
			.update({ access_expires_at: newExpiry })
			.eq('home_scope', params.scope)
			.not('access_expires_at', 'is', null)
			.select('id');
		if (dbError) {
			console.error('[admin/scopes/[scope]/api] bulk extend failed:', dbError.message);
			return json({ error: 'Failed to extend access' }, { status: 500 });
		}
		return json({ ok: true, extended: updated?.length ?? 0 });
	}

	if (action === 'convert') {
		const { identity_id } = body;
		if (typeof identity_id !== 'string') {
			return json({ error: 'identity_id is required' }, { status: 400 });
		}
		// Clears the guest fields; the identity_scopes grant stays — the member
		// keeps the corner and gains the commons.
		const { data: updated, error: dbError } = await supabase
			.from('profiles')
			.update({ access_expires_at: null, home_scope: null })
			.eq('id', identity_id)
			.eq('home_scope', params.scope)
			.select('id');
		if (dbError) {
			console.error('[admin/scopes/[scope]/api] convert failed:', dbError.message);
			return json({ error: 'Failed to convert member' }, { status: 500 });
		}
		if (!updated || updated.length === 0) {
			return json({ error: 'No guest of this corner with that identity' }, { status: 404 });
		}
		return json({ ok: true });
	}

	if (action === 'set_region') {
		const { region } = body;
		let validatedRegion: string | null = null;
		if (region !== undefined && region !== null && region !== '') {
			if (typeof region !== 'string' || !(region in REGIONS)) {
				return json(
					{ error: `region must be one of: ${Object.keys(REGIONS).join(', ')}` },
					{ status: 400 }
				);
			}
			validatedRegion = region;
		}
		// Existing conversations keep the region stamped at their publish —
		// changing a corner's region only affects future context and publishes.
		const { data: updated, error: dbError } = await supabase
			.from('scopes')
			.update({ region: validatedRegion })
			.eq('scope', params.scope)
			.select('scope');
		if (dbError) {
			console.error('[admin/scopes/[scope]/api] set_region failed:', dbError.message);
			return json({ error: 'Failed to set region' }, { status: 500 });
		}
		if (!updated || updated.length === 0) {
			return json({ error: 'Corner not found' }, { status: 404 });
		}
		return json({ ok: true });
	}

	// Exhaustive dispatch: an unrecognized action must not silently fall
	// through to the legacy revoke/restore path below.
	if (action !== undefined) {
		return json({ error: 'Unknown action' }, { status: 400 });
	}

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
