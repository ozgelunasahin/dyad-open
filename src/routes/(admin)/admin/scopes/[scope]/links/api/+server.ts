import { json } from '@sveltejs/kit';
import { nanoid } from 'nanoid';
import { makeAdminClient } from '$lib/server/supabase-admin';
import { joinOrigin } from '$lib/server/app-origin.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import type { RequestHandler } from './$types';

/**
 * Admin group-link endpoint — reusable, window-bound, optionally capped
 * invite links for a corner (conference use case).
 *
 * - POST: create a link. Body: { label?, join_closes_at, access_expires_at,
 *   max_redemptions? }. Returns the full join URL.
 * - PATCH: revoke or restore. Body: { id, revoked: boolean }. Revocation
 *   stops NEW redemptions only — existing guests keep access until their
 *   stamped expiry (see plan R2).
 *
 * Lives under /admin/* and is gated by the admin hook in src/hooks.server.ts.
 * Uses service-role; group_invite_links has no anon/authenticated access at
 * all (migration 20260605100100).
 */

const MAX_LABEL_LENGTH = 100;

function parseTimestamp(value: unknown): Date | null {
	if (typeof value !== 'string') return null;
	const d = new Date(value);
	return isNaN(d.getTime()) ? null : d;
}

export const POST: RequestHandler = async ({ params, request }) => {
	const supabase = makeAdminClient();
	const [body, errorResponse] = await parseJsonBody(request);
	if (errorResponse) return errorResponse;

	const { label, join_closes_at, access_expires_at, max_redemptions } = body;

	if (label !== undefined && label !== null && label !== '') {
		if (typeof label !== 'string' || label.length > MAX_LABEL_LENGTH) {
			return json(
				{ error: `label must be a string of at most ${MAX_LABEL_LENGTH} characters` },
				{ status: 400 }
			);
		}
	}

	const joinCloses = parseTimestamp(join_closes_at);
	if (!joinCloses) {
		return json({ error: 'join_closes_at must be a valid timestamp' }, { status: 400 });
	}
	const accessExpires = parseTimestamp(access_expires_at);
	if (!accessExpires) {
		return json({ error: 'access_expires_at must be a valid timestamp' }, { status: 400 });
	}
	if (joinCloses.getTime() > accessExpires.getTime()) {
		return json(
			{ error: 'the join window must close before access ends' },
			{ status: 400 }
		);
	}
	// A link whose access end is already past would stamp guests as expired
	// on their first request — reject rather than mint dead links.
	if (accessExpires.getTime() <= Date.now()) {
		return json({ error: 'access_expires_at must be in the future' }, { status: 400 });
	}

	let validatedCap: number | null = null;
	if (max_redemptions !== undefined && max_redemptions !== null && max_redemptions !== '') {
		if (
			typeof max_redemptions !== 'number' ||
			!Number.isInteger(max_redemptions) ||
			max_redemptions < 1
		) {
			return json(
				{ error: 'max_redemptions must be a positive integer' },
				{ status: 400 }
			);
		}
		validatedCap = max_redemptions;
	}

	// The target scope must exist and be live. region drives the join host
	// so the QR points at the corner's own domain (e.g. dyad.amsterdam).
	const { data: scopeRow } = await supabase
		.from('scopes')
		.select('scope, retired_at, region')
		.eq('scope', params.scope)
		.maybeSingle();
	if (!scopeRow) {
		return json({ error: 'Corner not found' }, { status: 404 });
	}
	if (scopeRow.retired_at !== null) {
		return json(
			{ error: 'This corner is retired and cannot take new group links' },
			{ status: 400 }
		);
	}

	const token = nanoid();
	const { error: dbError } = await supabase.from('group_invite_links').insert({
		token,
		scope: params.scope,
		label: typeof label === 'string' && label.trim() ? label.trim() : null,
		join_closes_at: joinCloses.toISOString(),
		access_expires_at: accessExpires.toISOString(),
		max_redemptions: validatedCap
	});

	if (dbError) {
		console.error('[admin/scopes/links] insert failed:', dbError.message);
		return json({ error: 'Failed to create group link' }, { status: 500 });
	}

	return json({ ok: true, url: `${joinOrigin(scopeRow.region)}/join?glink=${token}` });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const supabase = makeAdminClient();
	const [body, errorResponse] = await parseJsonBody(request);
	if (errorResponse) return errorResponse;

	const { id, revoked } = body;
	if (typeof id !== 'string' || !id.trim()) {
		return json({ error: 'id is required' }, { status: 400 });
	}
	if (typeof revoked !== 'boolean') {
		return json({ error: 'revoked must be boolean' }, { status: 400 });
	}

	const { data: updated, error: dbError } = await supabase
		.from('group_invite_links')
		.update({ revoked_at: revoked ? new Date().toISOString() : null })
		.eq('id', id)
		.eq('scope', params.scope)
		.select('id');

	if (dbError) {
		console.error('[admin/scopes/links] revoke failed:', dbError.message);
		return json({ error: 'Failed to update group link' }, { status: 500 });
	}
	if (!updated || updated.length === 0) {
		return json({ error: 'Group link not found' }, { status: 404 });
	}

	return json({ ok: true });
};
