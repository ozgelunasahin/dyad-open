import { json } from '@sveltejs/kit';
import {
	getEmailNotificationsEnabled,
	setEmailNotificationsEnabled,
	getMembershipGating,
	setMembershipGating
} from '$lib/server/app-settings';
import { isProtectedAction } from '$lib/domain/gating';
import type { RequestHandler } from './$types';

/**
 * Admin-plane settings endpoint. Lives under /admin/* and is gated by the
 * Cloudflare Access hook in src/hooks.server.ts. Uses the service-role
 * Supabase client — no user identity is involved.
 */

export const GET: RequestHandler = async () => {
	const [emailNotificationsEnabled, membershipGating] = await Promise.all([
		getEmailNotificationsEnabled(),
		getMembershipGating()
	]);
	return json({
		email_notifications_enabled: emailNotificationsEnabled,
		membership_gating: membershipGating
	});
};

export const PATCH: RequestHandler = async ({ request }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	// Per-action membership gating — REPLACES the whole config (not a merge) with
	// a validated map; the admin UI always sends the full desired object. A
	// non-UI caller omitting keys turns those actions off.
	if ('membership_gating' in body) {
		const gating = body.membership_gating;
		if (typeof gating !== 'object' || gating === null || Array.isArray(gating)) {
			return json({ error: 'membership_gating must be an object' }, { status: 400 });
		}
		for (const [key, value] of Object.entries(gating)) {
			if (!isProtectedAction(key)) {
				return json({ error: `Unknown action: ${key}` }, { status: 400 });
			}
			if (typeof value !== 'boolean') {
				return json({ error: `Flag for ${key} must be a boolean` }, { status: 400 });
			}
		}
		try {
			await setMembershipGating(gating as Record<string, boolean>);
		} catch {
			return json({ error: 'Failed to update settings' }, { status: 500 });
		}
		return json({ ok: true, membership_gating: await getMembershipGating() });
	}

	// Global notification kill switch.
	if (typeof body.email_notifications_enabled === 'boolean') {
		try {
			await setEmailNotificationsEnabled(body.email_notifications_enabled);
		} catch {
			return json({ error: 'Failed to update settings' }, { status: 500 });
		}
		return json({ ok: true, email_notifications_enabled: body.email_notifications_enabled });
	}

	return json({ error: 'No recognized setting in request' }, { status: 400 });
};
