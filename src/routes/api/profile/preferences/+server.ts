import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { parseJsonBody } from '$lib/server/parse-body.js';

/** GET — return the caller's preferences. */
export const GET: RequestHandler = async ({ locals }) => {
	const upactor = requireIdentity(locals);

	const { data, error } = await locals.supabase
		.from('profiles')
		.select('email_notifications')
		.eq('id', upactor.id)
		.maybeSingle();

	if (error) {
		console.error('[profile/preferences GET]', error);
		return json({ error: 'Failed to load preferences' }, { status: 500 });
	}

	return json({ email_notifications: data?.email_notifications ?? true });
};

/** PATCH — update the caller's preferences. */
export const PATCH: RequestHandler = async ({ locals, request }) => {
	const upactor = requireIdentity(locals);

	const [body, errorResponse] = await parseJsonBody<{ email_notifications?: unknown }>(request);
	if (errorResponse) return errorResponse;

	if (typeof body.email_notifications !== 'boolean') {
		return json({ error: 'email_notifications must be a boolean' }, { status: 400 });
	}

	const { error } = await locals.supabase
		.from('profiles')
		.update({ email_notifications: body.email_notifications })
		.eq('id', upactor.id);

	if (error) {
		console.error('[profile/preferences PATCH]', error);
		return json({ error: 'Failed to update preferences' }, { status: 500 });
	}

	return json({ ok: true, email_notifications: body.email_notifications });
};
