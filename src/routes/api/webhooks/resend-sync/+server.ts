import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { makeAdminClient } from '$lib/server/supabase-admin';
import {
	syncContactSegment,
	removeFromAllSegments,
	resendSegmentsConfigured,
	ALL_SEGMENTS,
	type Segment
} from '$lib/server/resend-segments';
import type { RequestHandler } from './$types';

/**
 * Supabase -> Resend segment sync webhook.
 *
 * A Supabase Database Webhook fires on INSERT/UPDATE/DELETE of `contacts`,
 * `invitations`, and `profiles` and POSTs the row here. We resolve the affected
 * email, ask the DB for that email's authoritative segment (`contact_segment`),
 * and reconcile Resend to match. Sends NO email — only moves segment membership.
 *
 * Recomputing the segment from the DB (not trusting which table fired) keeps the
 * handler idempotent: any of the three triggers converges on the same authority.
 *
 * Auth: shared secret in the `x-webhook-secret` header (RESEND_SYNC_SECRET).
 * Responses carry NO email/segment — Supabase stores delivery history, so a
 * reflected email would be member PII in that log. See docs/resend-segment-sync.md.
 */

interface WebhookPayload {
	type: string;
	table: string;
	record: Record<string, unknown> | null;
	old_record: Record<string, unknown> | null;
}

const VALID_TYPES = new Set(['INSERT', 'UPDATE', 'DELETE']);

/** Length-safe, constant-time-ish comparison without node:crypto (Workers-safe).
 *  Note: an unequal length returns early, which reveals only the secret's length
 *  — acceptable for a long random shared secret. */
function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export const POST: RequestHandler = async ({ request }) => {
	const secret = env.RESEND_SYNC_SECRET;
	if (!secret) {
		console.error('[resend-sync] RESEND_SYNC_SECRET not configured — rejecting');
		return json({ error: 'unavailable' }, { status: 503 });
	}

	const provided = request.headers.get('x-webhook-secret') ?? '';
	if (!safeEqual(provided, secret)) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	let payload: WebhookPayload;
	try {
		payload = (await request.json()) as WebhookPayload;
	} catch {
		return json({ error: 'invalid JSON body' }, { status: 400 });
	}

	// A cast is not validation — check the shape we actually rely on.
	if (typeof payload?.table !== 'string' || !VALID_TYPES.has(payload?.type)) {
		return json({ error: 'invalid payload' }, { status: 400 });
	}

	// Unconfigured Resend (e.g. a preview deploy): accept and no-op so Supabase
	// doesn't retry forever. A configured-but-failed reconcile returns 500 below.
	if (!resendSegmentsConfigured()) {
		return json({ ok: true });
	}

	let supabase;
	try {
		supabase = makeAdminClient();
	} catch (err) {
		console.error('[resend-sync] admin client unavailable:', err);
		return json({ error: 'unavailable' }, { status: 503 });
	}

	const row = payload.record ?? payload.old_record ?? {};

	// Resolve the email this change is about. contacts/invitations carry it
	// directly; profiles only carries the user id, looked up via the auth admin API.
	let email: string | undefined;
	if (payload.table === 'contacts' || payload.table === 'invitations') {
		if (typeof row.email === 'string') email = row.email;
	} else if (payload.table === 'profiles') {
		const id = typeof row.id === 'string' ? row.id : undefined;
		if (id) {
			const { data, error } = await supabase.auth.admin.getUserById(id);
			if (error) console.error('[resend-sync] getUserById failed:', error.message);
			email = data?.user?.email ?? undefined;
		}
	} else {
		// Webhook attached to an unexpected table — accept so Supabase stops
		// retrying, but do nothing.
		return json({ ok: true });
	}

	if (!email) {
		return json({ ok: true });
	}

	const { data: segment, error: rpcError } = await supabase.rpc('contact_segment', {
		p_email: email
	});
	if (rpcError) {
		console.error('[resend-sync] contact_segment failed:', rpcError.message);
		// 500 so Supabase retries — a transient DB hiccup shouldn't drop the sync.
		return json({ error: 'segment lookup failed' }, { status: 500 });
	}

	let ok: boolean;
	if (segment === null || segment === undefined) {
		ok = await removeFromAllSegments(email);
	} else if ((ALL_SEGMENTS as string[]).includes(segment as string)) {
		ok = await syncContactSegment(email, segment as Segment);
	} else {
		console.error('[resend-sync] unexpected segment value:', segment);
		return json({ error: 'unexpected segment' }, { status: 500 });
	}

	if (!ok) {
		// A configured reconcile that didn't fully land — 500 so Supabase retries
		// (the reconcile is idempotent).
		return json({ error: 'sync incomplete' }, { status: 500 });
	}
	return json({ ok: true });
};
