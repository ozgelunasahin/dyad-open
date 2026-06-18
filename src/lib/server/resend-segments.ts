import { env } from '$env/dynamic/private';

/**
 * Resend segment membership sync.
 *
 * This module ONLY manages which Resend segment a contact belongs to. It never
 * sends email — it touches `/contacts` and `/contacts/{email}/segments/{id}`
 * exclusively, never `/emails`. Transactional sending stays in
 * `src/lib/server/email.ts`; the two concerns are deliberately separate.
 *
 * Source of truth is Supabase (see contact_segment() in
 * 20260618120000_resend_segment_sync.sql). A Database Webhook drives
 * `syncContactSegment` so Resend mirrors the DB instead of being written to by
 * hand. Segment IDs come from env so the same code works across Resend
 * workspaces without a redeploy-time constant.
 */

const RESEND_API = 'https://api.resend.com';
const TIMEOUT_MS = 10_000;

export type Segment = 'waitlist' | 'invited' | 'member';
export const ALL_SEGMENTS: Segment[] = ['waitlist', 'invited', 'member'];

function segmentId(segment: Segment): string | undefined {
	switch (segment) {
		case 'waitlist':
			return env.RESEND_SEGMENT_WAITLIST;
		case 'invited':
			return env.RESEND_SEGMENT_INVITED;
		case 'member':
			return env.RESEND_SEGMENT_MEMBER;
	}
}

/** True only when the API key and all three segment IDs are configured. */
export function resendSegmentsConfigured(): boolean {
	return Boolean(
		env.RESEND_API_KEY &&
			env.RESEND_SEGMENT_WAITLIST &&
			env.RESEND_SEGMENT_INVITED &&
			env.RESEND_SEGMENT_MEMBER
	);
}

async function rf(
	path: string,
	method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
	body?: unknown
): Promise<Response | null> {
	try {
		return await fetch(`${RESEND_API}${path}`, {
			method,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.RESEND_API_KEY}`
			},
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch (err) {
		console.error(`[resend-segments] ${method} ${path} fetch failed:`, err);
		return null;
	}
}

/** Split a full name into Resend's first_name / last_name fields. */
function splitName(name?: string): { first_name?: string; last_name?: string } {
	const trimmed = (name ?? '').trim();
	if (!trimmed) return {};
	const parts = trimmed.split(/\s+/);
	return { first_name: parts[0], last_name: parts.slice(1).join(' ') || undefined };
}

/** Ensure the contact exists with its name. Resend 409/422 on an already-present
 *  contact is fine — but POST won't update an existing contact's name, so PATCH
 *  it too so names stay current (and backfill onto contacts Resend already had). */
async function ensureContact(email: string, name?: string): Promise<void> {
	const nameFields = splitName(name);
	const res = await rf('/contacts', 'POST', { email, unsubscribed: false, ...nameFields });
	if (res && !res.ok && res.status !== 409 && res.status !== 422) {
		console.error('[resend-segments] ensureContact:', res.status, await res.text());
	}
	if (name) {
		await rf(`/contacts/${encodeURIComponent(email)}`, 'PATCH', nameFields);
	}
}

async function addToSegment(email: string, id: string): Promise<void> {
	const res = await rf(`/contacts/${encodeURIComponent(email)}/segments/${id}`, 'POST');
	if (res && !res.ok && res.status !== 409) {
		console.error('[resend-segments] addToSegment:', res.status, await res.text());
	}
}

async function removeFromSegment(email: string, id: string): Promise<void> {
	const res = await rf(`/contacts/${encodeURIComponent(email)}/segments/${id}`, 'DELETE');
	// 404 = not in that segment; that's the desired end state, not an error.
	if (res && !res.ok && res.status !== 404) {
		console.error('[resend-segments] removeFromSegment:', res.status, await res.text());
	}
}

/**
 * Reconcile a contact to belong to exactly `target` and no other segment.
 *
 * Idempotent: safe to call repeatedly with the same target. Returns false when
 * Resend is unconfigured (so callers can no-op cleanly in dev) and true once
 * the reconcile has been attempted.
 */
export async function syncContactSegment(
	email: string,
	target: Segment,
	opts: { name?: string } = {}
): Promise<boolean> {
	if (!resendSegmentsConfigured()) {
		console.error('[resend-segments] skipped: RESEND_API_KEY / RESEND_SEGMENT_* not configured');
		return false;
	}

	const normalized = email.trim().toLowerCase();
	const targetId = segmentId(target);
	if (!targetId) {
		console.error(`[resend-segments] no segment id for "${target}"`);
		return false;
	}

	await ensureContact(normalized, opts.name);
	await addToSegment(normalized, targetId);

	// Strip membership from the other two segments so the contact lands in
	// exactly one — mirroring the DB's single-segment authority.
	for (const seg of ALL_SEGMENTS) {
		if (seg === target) continue;
		const id = segmentId(seg);
		if (id) await removeFromSegment(normalized, id);
	}
	return true;
}

/**
 * Remove a contact from all three managed segments. Used when the DB no longer
 * knows the email (e.g. a waitlist row was deleted and they were never invited).
 */
export async function removeFromAllSegments(email: string): Promise<boolean> {
	if (!resendSegmentsConfigured()) return false;
	const normalized = email.trim().toLowerCase();
	for (const seg of ALL_SEGMENTS) {
		const id = segmentId(seg);
		if (id) await removeFromSegment(normalized, id);
	}
	return true;
}
