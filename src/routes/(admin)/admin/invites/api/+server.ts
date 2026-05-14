import { json, error } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { makeAdminClient } from '$lib/server/supabase-admin';
import { sendEmail } from '$lib/server/email.js';
import { nanoid } from 'nanoid';
import { copy } from '$lib/copy';
import { renderInviteEmail } from './render-invite-email.js';
import type { RequestHandler } from './$types';

/**
 * Admin-plane invite endpoint.
 *
 * Lives under /admin/* and is gated by the admin Basic Auth hook in
 * src/hooks.server.ts. Uses the service-role Supabase client — no user
 * identity is involved at any point.
 *
 * Replaces the former /api/invites endpoint, which leaked admin authority
 * into the user app's API surface.
 */

/** Derive the app origin from the Supabase URL or fall back to production. */
const APP_ORIGIN =
	PUBLIC_SUPABASE_URL?.includes('localhost') || PUBLIC_SUPABASE_URL?.includes('127.0.0.1')
		? 'http://localhost:5173'
		: 'https://dyad.berlin';

const INVITE_EXPIRY_DAYS = 14;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_SIGNATURE_FIELD_LENGTH = 80;

/** Return the trimmed opener line from the admin's `name` input. Undefined when blank.
 *  Returns raw text — `renderInviteEmail` escapes at the interpolation point. */
function buildOpener(name: unknown): string | undefined {
	if (typeof name === 'string' && name.trim()) {
		return name.trim();
	}
	return undefined;
}

/** Validate an optional short text field (signature override).
 *  Returns the trimmed value, or `undefined` when omitted/empty/whitespace.
 *  Throws an `error(400, …)` HttpError when the input is the wrong type or
 *  exceeds `MAX_SIGNATURE_FIELD_LENGTH` — those branches never return. */
function validateShortText(value: unknown, fieldName: string): string | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string') error(400, `${fieldName} must be a string`);
	const trimmed = value.trim();
	if (trimmed.length === 0) return undefined;
	if (trimmed.length > MAX_SIGNATURE_FIELD_LENGTH) {
		error(400, `${fieldName} must be at most ${MAX_SIGNATURE_FIELD_LENGTH} characters`);
	}
	return trimmed;
}

export const POST: RequestHandler = async ({ request }) => {
	// Auth is enforced by the admin hook before we get here.
	const supabase = makeAdminClient();

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}
	const { email, name, message, scope, signatureClosing, signatureNames } = body;

	if (!email || typeof email !== 'string') {
		error(400, 'Email is required');
	}

	// Validate + trim the optional custom message.
	let trimmedMessage: string | undefined;
	if (message !== undefined && message !== null && message !== '') {
		if (typeof message !== 'string') {
			error(400, 'message must be a string');
		}
		const candidate = message.trim();
		if (candidate.length > MAX_MESSAGE_LENGTH) {
			error(400, `message must be at most ${MAX_MESSAGE_LENGTH} characters`);
		}
		if (candidate.length > 0) trimmedMessage = candidate;
	}

	// Validate optional signature overrides. Both default to copy.email.signature.*
	// in the renderer when omitted; empty strings are treated as omitted.
	const validatedSignatureClosing = validateShortText(signatureClosing, 'signatureClosing');
	const validatedSignatureNames = validateShortText(signatureNames, 'signatureNames');

	// Validate optional scope. Must reference an existing, non-retired scope.
	// FK enforces existence; we validate non-retired in app layer (FK doesn't
	// cascade on retired_at).
	let validatedScope: string | null = null;
	if (scope !== undefined && scope !== null && scope !== '') {
		if (typeof scope !== 'string') {
			error(400, 'scope must be a string');
		}
		const { data: scopeRow } = await supabase
			.from('scopes')
			.select('scope, retired_at')
			.eq('scope', scope)
			.maybeSingle();
		if (!scopeRow) {
			error(400, 'scope does not exist');
		}
		if (scopeRow.retired_at !== null) {
			error(400, 'scope is retired and cannot be attached to new invitations');
		}
		validatedScope = scope;
	}

	// Check if this email already has an unused, non-expired invitation
	const { data: existing } = await supabase
		.from('invitations')
		.select('id, token, expires_at, used_at')
		.eq('email', email.trim())
		.is('used_at', null)
		.gt('expires_at', new Date().toISOString())
		.limit(1);

	if (existing && existing.length > 0) {
		// Already has a valid invite — resend the email and return the existing link.
		// sendEmail returns false on delivery failure (it does not throw); surface
		// the result so the admin UI can distinguish "link valid + email sent" from
		// "link valid + email failed to send" instead of always claiming success.
		const inviteUrl = `${APP_ORIGIN}/join?token=${existing[0].token}`;
		const delivered = await sendEmail({
			to: email.trim(),
			subject: copy.email.inviteSubject,
			html: renderInviteEmail({
				opener: buildOpener(name),
				inviteUrl,
				message: trimmedMessage,
				expiryDays: INVITE_EXPIRY_DAYS,
				signatureClosing: validatedSignatureClosing,
				signatureNames: validatedSignatureNames
			})
		});
		return json({ ok: true, alreadyInvited: true, inviteUrl, delivered });
	}

	// Check if this email is already a registered user
	const { data: usedInvite } = await supabase
		.from('invitations')
		.select('id')
		.eq('email', email.trim())
		.not('used_at', 'is', null)
		.limit(1);

	if (usedInvite && usedInvite.length > 0) {
		return json({ error: 'This person has already signed up.' }, { status: 409 });
	}

	// Generate new invitation. invited_by is null — the admin plane has no
	// user identity. If a future operator-attribution column is added (e.g.
	// invited_by_operator: text), populate it here from the basic-auth username.
	const token = nanoid();
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

	const { error: dbError } = await supabase.from('invitations').insert({
		email: email.trim(),
		token,
		expires_at: expiresAt.toISOString(),
		invited_by: null,
		scope: validatedScope
	});

	if (dbError) {
		console.error('Failed to create invitation:', dbError);
		error(500, 'Failed to create invitation');
	}

	const inviteUrl = `${APP_ORIGIN}/join?token=${token}`;

	// Send invite email. sendEmail returns false on delivery failure (it does not
	// throw); surface the result so the admin UI can distinguish a successful
	// invitation+email from an invitation row that was created but the email
	// didn't go out (e.g. provider misconfig, Resend rejection).
	const delivered = await sendEmail({
		to: email.trim(),
		subject: copy.email.inviteSubject,
		html: renderInviteEmail({
			opener: buildOpener(name),
			inviteUrl,
			message: trimmedMessage,
			expiryDays: INVITE_EXPIRY_DAYS,
			signatureClosing: validatedSignatureClosing,
			signatureNames: validatedSignatureNames
		})
	});

	return json({ ok: true, inviteUrl, delivered });
};
