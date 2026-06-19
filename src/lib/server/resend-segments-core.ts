/**
 * Resend segment-membership reconcile — pure core.
 *
 * No SvelteKit / `$env` imports, so this is shared by BOTH the SvelteKit module
 * (`resend-segments.ts`, which reads `$env`) and the backfill script
 * (`scripts/sync-resend-segments.ts`, which reads `process.env` via dotenv).
 * One implementation, no hand-synced copies.
 *
 * Manages ONLY which segment a contact belongs to — it touches `/contacts` and
 * `/contacts/{email}/segments/{id}` exclusively, never `/emails`. Sending stays
 * in `src/lib/server/email-providers/`.
 *
 * Email-only by design: segment membership needs the email and nothing else. We
 * deliberately do NOT push name, city, or any other personal data to Resend —
 * see CLAUDE.md "Data Collection and Values". Enriching the contact would be a
 * new data use to a US processor, requiring a /datenschutz decision; don't add
 * it here without one.
 */

export const RESEND_API = 'https://api.resend.com';
const TIMEOUT_MS = 10_000;

export type Segment = 'waitlist' | 'invited' | 'member';
export const ALL_SEGMENTS: Segment[] = ['waitlist', 'invited', 'member'];

export interface ResendConfig {
	apiKey: string;
	/** Resend segment id per segment name. */
	segmentIds: Record<Segment, string>;
}

/** Fetch wrapper. Returns the Response, or null on network/timeout failure. */
async function rf(
	cfg: ResendConfig,
	path: string,
	method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
	body?: unknown
): Promise<Response | null> {
	try {
		return await fetch(`${RESEND_API}${path}`, {
			method,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${cfg.apiKey}`
			},
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch (err) {
		console.error(`[resend-segments] ${method} ${path} fetch failed:`, err);
		return null;
	}
}

/** Ensure the contact exists (email only). true = present/created, false = unexpected failure. */
async function ensureContact(cfg: ResendConfig, email: string): Promise<boolean> {
	const res = await rf(cfg, '/contacts', 'POST', { email, unsubscribed: false });
	if (!res) return false;
	// 409/422 = already present, which is the desired state.
	if (res.ok || res.status === 409 || res.status === 422) return true;
	console.error('[resend-segments] ensureContact:', res.status, await res.text());
	return false;
}

async function addToSegment(cfg: ResendConfig, email: string, id: string): Promise<boolean> {
	const res = await rf(cfg, `/contacts/${encodeURIComponent(email)}/segments/${id}`, 'POST');
	if (!res) return false;
	if (res.ok || res.status === 409) return true; // 409 = already a member
	console.error('[resend-segments] addToSegment:', res.status, await res.text());
	return false;
}

async function removeFromSegment(cfg: ResendConfig, email: string, id: string): Promise<boolean> {
	const res = await rf(cfg, `/contacts/${encodeURIComponent(email)}/segments/${id}`, 'DELETE');
	if (!res) return false;
	if (res.ok || res.status === 404) return true; // 404 = not in that segment (desired end state)
	console.error('[resend-segments] removeFromSegment:', res.status, await res.text());
	return false;
}

/**
 * Reconcile a contact to belong to exactly `target` and no other segment.
 *
 * Idempotent. Returns `false` if any Resend call failed (so the caller can
 * return a retryable error). The other segments are stripped ONLY after the
 * target add succeeds, so a partial failure can never leave the contact in zero
 * segments.
 */
export async function syncContactSegment(
	cfg: ResendConfig,
	email: string,
	target: Segment
): Promise<boolean> {
	const normalized = email.trim().toLowerCase();
	const targetId = cfg.segmentIds[target];
	if (!targetId) {
		console.error(`[resend-segments] no segment id for "${target}"`);
		return false;
	}

	const ensured = await ensureContact(cfg, normalized);
	const added = await addToSegment(cfg, normalized, targetId);

	let ok = ensured && added;
	if (added) {
		// Only strip the other segments once the contact is definitely in the
		// target — never leave them with zero memberships on a failed add.
		for (const seg of ALL_SEGMENTS) {
			if (seg === target) continue;
			const id = cfg.segmentIds[seg];
			if (id) ok = (await removeFromSegment(cfg, normalized, id)) && ok;
		}
	}
	return ok;
}

/** Remove a contact from all three managed segments. Returns false on any failure. */
export async function removeFromAllSegments(cfg: ResendConfig, email: string): Promise<boolean> {
	const normalized = email.trim().toLowerCase();
	let ok = true;
	for (const seg of ALL_SEGMENTS) {
		const id = cfg.segmentIds[seg];
		if (id) ok = (await removeFromSegment(cfg, normalized, id)) && ok;
	}
	return ok;
}
