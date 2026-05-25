import { json } from '@sveltejs/kit';
import {
	getEmailNotificationsEnabled,
	setEmailNotificationsEnabled
} from '$lib/server/app-settings';
import type { RequestHandler } from './$types';

/**
 * Admin-plane settings endpoint. Lives under /admin/* and is gated by the
 * Cloudflare Access hook in src/hooks.server.ts. Uses the service-role
 * Supabase client — no user identity is involved.
 */

export const GET: RequestHandler = async () => {
	const emailNotificationsEnabled = await getEmailNotificationsEnabled();
	return json({ email_notifications_enabled: emailNotificationsEnabled });
};

export const PATCH: RequestHandler = async ({ request }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	if (typeof body.email_notifications_enabled !== 'boolean') {
		return json(
			{ error: 'email_notifications_enabled must be a boolean' },
			{ status: 400 }
		);
	}

	try {
		await setEmailNotificationsEnabled(body.email_notifications_enabled);
	} catch {
		return json({ error: 'Failed to update settings' }, { status: 500 });
	}

	return json({
		ok: true,
		email_notifications_enabled: body.email_notifications_enabled
	});
};
