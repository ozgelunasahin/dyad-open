import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { makeAdminClient } from '$lib/server/supabase-admin';
import {
	syncContactSegment,
	removeFromAllSegments,
	type Segment
} from '$lib/server/resend-segments';
import type { RequestHandler } from './$types';

/**
 * Supabase -> Resend segment sync webhook.
 *
 * A Supabase Database Webhook fires on INSERT/UPDATE/DELETE of `contacts`,
 * `invitations`, and `profiles` and POSTs the row here. We resolve the affected
 * email, ask the DB for that email's authoritative segment (contact_segment),
 * and reconcile Resend to match. This sends NO email — it only moves the
 * contact between segments.
 *
 * Recomputing the segment from the DB (rather than trusting which table fired)
 * keeps the handler idempotent and correct no matter the trigger: a profiles
 * onboarding flip, a new invitation, and a fresh waitlist row all converge on
 * the same authority function.
 *
 * Auth: a shared secret in the `x-webhook-secret` header, configured both here
 * (RESEND_SYNC_SECRET) and on the Supabase webhook. See
 * docs/resend-segment-sync.md.
 */

interface WebhookPayload {
	type: 'INSERT' | 'UPDATE' | 'DELETE';
	table: string;
	schema: string;
	record: Record<string, unknown> | null;
	old_record: Record<string, unknown> | null;
}

/** Length-safe, constant-time string comparison (avoids node:crypto so this
 *  runs unchanged on Cloudflare Workers). */
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
		return json({ error: 'Not configured' }, { status: 503 });
	}

	const provided = request.headers.get('x-webhook-secret') ?? '';
	if (!safeEqual(provided, secret)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let payload: WebhookPayload;
	try {
		payload = (await request.json()) as WebhookPayload;
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const row = payload.record ?? payload.old_record ?? {};
	const supabase = makeAdminClient();

	// Resolve the email this change is about. contacts/invitations carry it
	// directly; profiles only carries the user id, so look it up via auth admin.
	let email: string | undefined;
	let name: string | undefined;

	if (payload.table === 'contacts' || payload.table === 'invitations') {
		if (typeof row.email === 'string') email = row.email;
		if (typeof row.name === 'string') name = row.name;
	} else if (payload.table === 'profiles') {
		const id = typeof row.id === 'string' ? row.id : undefined;
		if (id) {
			const { data, error } = await supabase.auth.admin.getUserById(id);
			if (error) console.error('[resend-sync] getUserById failed:', error.message);
			email = data?.user?.email ?? undefined;
		}
		if (typeof row.display_name === 'string') name = row.display_name;
		else if (typeof row.username === 'string') name = row.username;
	} else {
		// Webhook attached to an unexpected table — accept so Supabase doesn't
		// retry, but do nothing.
		return json({ ok: true, skipped: 'unhandled table' });
	}

	if (!email) {
		return json({ ok: true, skipped: 'no email resolved' });
	}

	// Enrich from the contacts (waitlist) row, which is the only place name and
	// city (`based_in`, the "where are you based?" answer) live. Doing this by
	// email means name + city sync no matter which table triggered the webhook.
	let city: string | undefined;
	const { data: contactRow } = await supabase
		.from('contacts')
		.select('name, based_in')
		.eq('email', email)
		.maybeSingle();
	if (contactRow) {
		if (!name && typeof contactRow.name === 'string') name = contactRow.name;
		if (typeof contactRow.based_in === 'string') city = contactRow.based_in;
	}

	const { data: segment, error: rpcError } = await supabase.rpc('contact_segment', {
		p_email: email
	});
	if (rpcError) {
		console.error('[resend-sync] contact_segment failed:', rpcError.message);
		// 500 so Supabase retries — a transient DB hiccup shouldn't drop the sync.
		return json({ error: 'segment lookup failed' }, { status: 500 });
	}

	if (segment === null || segment === undefined) {
		await removeFromAllSegments(email);
		return json({ ok: true, email, segment: null });
	}

	await syncContactSegment(email, segment as Segment, { name, city });
	return json({ ok: true, email, segment });
};
