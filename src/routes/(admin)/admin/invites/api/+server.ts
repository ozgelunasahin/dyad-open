import { json, error } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { makeAdminClient } from '$lib/server/supabase-admin';
import { sendEmail } from '$lib/server/email.js';
import { escapeHtml } from '$lib/utils/escape-html.js';
import { nanoid } from 'nanoid';
import { copy } from '$lib/copy';
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

/**
 * Render the invitation email body.
 *
 * `opener` is the admin's own opening line — e.g. "Hey —" or "Hi friend,".
 * Rendered verbatim (no "Hi " prefix). Omit entirely when empty.
 *
 * `message` (when non-empty) is a quoted block beneath the opener.
 *
 * Both fields are escaped before interpolation; line breaks in the message
 * are preserved as <br> tags.
 */
function renderInviteEmail(params: {
	opener?: string;
	inviteUrl: string;
	message?: string;
}): string {
	const openerBlock = params.opener ? `\n\t\t\t\t<p>${params.opener}</p>` : '';
	const personalBlock = params.message
		? `
				<blockquote style="margin: 0 0 24px; padding: 12px 16px; background: #f7f4ee; border-left: 3px solid #c8c2b6; font-style: italic; color: #3a3a3a; white-space: pre-wrap;">${escapeHtml(
					params.message
				).replace(/\n/g, '<br>')}</blockquote>`
		: '';

	return `
			<div style="font-family: Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; line-height: 1.7;">${openerBlock}${personalBlock}
				<p><a href="${params.inviteUrl}" style="color: #1a1a1a; font-weight: bold; text-decoration: underline;">Join dyad</a></p>
				<p style="font-size: 14px; color: #666;">This link expires in ${INVITE_EXPIRY_DAYS} days.</p>
				<hr style="border: none; border-top: 1px solid #e0ddd8; margin: 32px 0 16px;" />
				<a href="https://dyad.berlin" style="display: inline-block;"><img src="https://dyad.berlin/images/logo-dark.png" alt="dyad" style="height: 32px; width: auto; margin-bottom: 8px;" /></a>
				<p style="font-size: 12px; color: #999; margin: 0;">cultivating a culture of conversation</p>
			</div>
		`;
}

/** Build the escaped opener line from the admin's `name` input. Undefined when blank. */
function buildOpener(name: unknown): string | undefined {
	if (typeof name === 'string' && name.trim()) {
		return escapeHtml(name.trim());
	}
	return undefined;
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
	const { email, name, message } = body;

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

	// Check if this email already has an unused, non-expired invitation
	const { data: existing } = await supabase
		.from('invitations')
		.select('id, token, expires_at, used_at')
		.eq('email', email.trim())
		.is('used_at', null)
		.gt('expires_at', new Date().toISOString())
		.limit(1);

	if (existing && existing.length > 0) {
		// Already has a valid invite — resend the email and return the existing link
		const inviteUrl = `${APP_ORIGIN}/join?token=${existing[0].token}`;
		await sendEmail({
			to: email.trim(),
			subject: copy.email.inviteSubject,
			html: renderInviteEmail({ opener: buildOpener(name), inviteUrl, message: trimmedMessage })
		}).catch((err) => console.error('[admin/invites] Failed to resend invite email:', err));
		return json({ ok: true, alreadyInvited: true, inviteUrl });
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
		invited_by: null
	});

	if (dbError) {
		console.error('Failed to create invitation:', dbError);
		error(500, 'Failed to create invitation');
	}

	const inviteUrl = `${APP_ORIGIN}/join?token=${token}`;

	// Send invite email
	await sendEmail({
		to: email.trim(),
		subject: copy.email.inviteSubject,
		html: renderInviteEmail({ opener: buildOpener(name), inviteUrl, message: trimmedMessage })
	}).catch((err) => console.error('[admin/invites] Failed to send invite email:', err));

	return json({ ok: true, inviteUrl });
};
