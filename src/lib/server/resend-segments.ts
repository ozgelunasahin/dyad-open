import { env } from '$env/dynamic/private';
import {
	ALL_SEGMENTS,
	syncContactSegment as coreSync,
	removeFromAllSegments as coreRemoveAll,
	type ResendConfig,
	type Segment
} from './resend-segments-core';

/**
 * SvelteKit-side Resend segment sync: resolves config from `$env` and delegates
 * to the pure core in `resend-segments-core.ts`. Source of truth is Supabase
 * (see `contact_segment()`); a Database Webhook drives this so Resend mirrors the
 * DB. Segment ids come from env so the same code works across Resend workspaces.
 */

export { ALL_SEGMENTS, type Segment };

function buildConfig(): ResendConfig | null {
	const apiKey = env.RESEND_API_KEY;
	const waitlist = env.RESEND_SEGMENT_WAITLIST;
	const invited = env.RESEND_SEGMENT_INVITED;
	const member = env.RESEND_SEGMENT_MEMBER;
	if (!apiKey || !waitlist || !invited || !member) return null;
	return { apiKey, segmentIds: { waitlist, invited, member } };
}

/** True only when the API key and all three segment ids are configured. */
export function resendSegmentsConfigured(): boolean {
	return buildConfig() !== null;
}

/** Reconcile `email` into exactly `target`. Returns false when unconfigured or any Resend call failed. */
export async function syncContactSegment(email: string, target: Segment): Promise<boolean> {
	const cfg = buildConfig();
	if (!cfg) {
		console.error('[resend-segments] skipped: RESEND_API_KEY / RESEND_SEGMENT_* not configured');
		return false;
	}
	return coreSync(cfg, email, target);
}

/** Remove `email` from all managed segments. Returns false when unconfigured or any call failed. */
export async function removeFromAllSegments(email: string): Promise<boolean> {
	const cfg = buildConfig();
	if (!cfg) return false;
	return coreRemoveAll(cfg, email);
}
