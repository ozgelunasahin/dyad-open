import { json, error } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { sendEmail } from '$lib/server/email.js';
import { escapeHtml } from '$lib/utils/escape-html.js';
import { nanoid } from 'nanoid';
import { copy } from '$lib/copy';
import type { RequestHandler } from './$types';

/** Derive the app origin from the Supabase URL or fall back to production. */
const APP_ORIGIN =
	PUBLIC_SUPABASE_URL?.includes('localhost') || PUBLIC_SUPABASE_URL?.includes('127.0.0.1')
		? 'http://localhost:5173'
		: 'https://dyad.berlin';

const INVITE_EXPIRY_DAYS = 14;
const MAX_MESSAGE_LENGTH = 2000;

async function requireAdmin(locals: App.Locals) {
	if (!locals.user) {
		error(401, 'Authentication required');
	}
	if (!locals.isAdmin) { // out-of-port admin channel, see hooks.server.ts
		error(403, 'Admin access required');
	}
}

/**
 * Render the invitation email body.
 *
 * `opener` is the admin's own opening line — e.g. "Hey T —" or "Hi Ozge,".
 * Rendered verbatim (no "Hi " prefix). Omit entirely when empty, so the
 * email leads straight into the personal message / standard copy rather
 * than a defensive "Hi there,".
 *
 * `message` (when non-empty) is a quoted block beneath the opener — the
 * recipient reads the sender's own words first, then the standard "you've
 * been invited" framing.
 *
 * Both fields are escaped before interpolation; line breaks in the message
 * are preserved as <br> tags. Everything else is plain text.
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

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireAdmin(locals);

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

	// Validate + trim the optional custom message. Admin-only surface, so a
	// clear 400 is fine — this is a sanity guard, not a user-facing error.
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
	const { data: existing } = await locals.supabase
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
		}).catch((err) => console.error('[invites] Failed to resend invite email:', err));
		return json({ ok: true, alreadyInvited: true, inviteUrl });
	}

	// Check if this email is already a registered user
	// (We can check if an invitation was already used)
	const { data: usedInvite } = await locals.supabase
		.from('invitations')
		.select('id')
		.eq('email', email.trim())
		.not('used_at', 'is', null)
		.limit(1);

	if (usedInvite && usedInvite.length > 0) {
		return json({ error: 'This person has already signed up.' }, { status: 409 });
	}

	// Generate new invitation
	const token = nanoid();
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

	const { error: dbError } = await locals.supabase.from('invitations').insert({
		email: email.trim(),
		token,
		expires_at: expiresAt.toISOString(),
		invited_by: locals.user!.id
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
	}).catch((err) => console.error('[invites] Failed to send invite email:', err));

	return json({ ok: true, inviteUrl });
};
