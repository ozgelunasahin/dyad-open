import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireIdentity } from '$lib/services/identity.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import { EMAIL_NOTIFICATIONS_DEFAULT } from '$lib/domain/types.js';

/** Per-event flags a member may toggle. */
const FLAG_KEYS = ['invitation_received', 'invitation_answered', 'meeting_cancelled'] as const;

type FlagKey = (typeof FLAG_KEYS)[number];

const EMAIL_MAX_LENGTH = 320;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PreferencesPayload {
	email: string | null;
	invitation_received: boolean;
	invitation_answered: boolean;
	meeting_cancelled: boolean;
}

function withDefaults(
	row: Partial<PreferencesPayload> | null | undefined
): PreferencesPayload {
	return {
		email: row?.email ?? null,
		invitation_received: row?.invitation_received ?? EMAIL_NOTIFICATIONS_DEFAULT,
		invitation_answered: row?.invitation_answered ?? EMAIL_NOTIFICATIONS_DEFAULT,
		meeting_cancelled: row?.meeting_cancelled ?? EMAIL_NOTIFICATIONS_DEFAULT
	};
}

/** GET — return the caller's notification settings. */
export const GET: RequestHandler = async ({ locals }) => {
	const upactor = requireIdentity(locals);

	const { data, error } = await locals.supabase
		.from('notification_settings')
		.select('email, invitation_received, invitation_answered, meeting_cancelled')
		.eq('user_id', upactor.id)
		.maybeSingle();

	if (error) {
		console.error('[profile/preferences GET]', error);
		return json({ error: 'Failed to load preferences' }, { status: 500 });
	}

	return json(withDefaults(data));
};

/** PATCH — update any subset of the caller's notification settings.
 *
 *  `email` is the opt-in: a valid address turns notifications on for this
 *  member; null (or '') clears it and nothing is sent. The per-event flags
 *  refine which events mail once an address exists. */
export const PATCH: RequestHandler = async ({ locals, request }) => {
	const upactor = requireIdentity(locals);

	const [body, errorResponse] = await parseJsonBody<Record<string, unknown>>(request);
	if (errorResponse) return errorResponse;

	// JSON.parse accepts primitives; the `in` checks below need an object.
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const updates: Partial<PreferencesPayload> = {};

	if ('email' in body) {
		const raw = body.email;
		if (raw === null || (typeof raw === 'string' && raw.trim() === '')) {
			updates.email = null;
		} else if (typeof raw === 'string') {
			const email = raw.trim();
			if (email.length > EMAIL_MAX_LENGTH || !EMAIL_SHAPE.test(email)) {
				return json({ error: 'That does not look like an email address' }, { status: 400 });
			}
			updates.email = email;
		} else {
			return json({ error: 'email must be a string or null' }, { status: 400 });
		}
	}

	for (const key of FLAG_KEYS) {
		if (!(key in body)) continue;
		if (typeof body[key] !== 'boolean') {
			return json({ error: `${key} must be a boolean` }, { status: 400 });
		}
		updates[key] = body[key] as boolean;
	}

	if (Object.keys(updates).length === 0) {
		return json({ error: 'No recognized preference keys' }, { status: 400 });
	}

	// Upsert through the user-scoped client: owner-only RLS (INSERT WITH CHECK
	// + UPDATE USING on user_id) is the enforcement that members touch only
	// their own row. updated_at is maintained by the table's BEFORE UPDATE
	// trigger.
	const { error } = await locals.supabase
		.from('notification_settings')
		.upsert({ user_id: upactor.id, ...updates }, { onConflict: 'user_id' });

	if (error) {
		console.error('[profile/preferences PATCH]', error);
		return json({ error: 'Failed to update preferences' }, { status: 500 });
	}

	return json({ ok: true, ...updates });
};
