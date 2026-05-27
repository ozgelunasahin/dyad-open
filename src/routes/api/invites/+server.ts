import { json, error } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { sendEmail } from '$lib/server/email.js';
import { addToAudience } from '$lib/server/resend-contacts.js';
import { escapeHtml } from '$lib/utils/escape-html.js';
import { nanoid } from 'nanoid';
import { copy } from '$lib/copy';
import { captureServer } from '$lib/server/posthog.js';
import {
	renderTiptapToEmailHtml,
	buildInviteEmailHtml,
	INVITE_EXPIRY_DAYS as EXPIRY_DAYS
} from '$lib/utils/tiptap-email-html.js';
import type { JSONContent } from '@tiptap/core';
import type { RequestHandler } from './$types';

/** Derive the app origin from the Supabase URL or fall back to production. */
const APP_ORIGIN =
	PUBLIC_SUPABASE_URL?.includes('localhost') || PUBLIC_SUPABASE_URL?.includes('127.0.0.1')
		? 'http://localhost:5173'
		: 'https://dyad.berlin';

const INVITE_EXPIRY_DAYS = EXPIRY_DAYS;
const MAX_MESSAGE_LENGTH = 2000;

async function requireAdmin(locals: App.Locals) {
	if (!locals.user) {
		error(401, 'Authentication required');
	}
	if (locals.user.app_metadata?.role !== 'admin') {
		error(403, 'Admin access required');
	}
}

/**
 * Build invitation email HTML.
 *
 * Accepts either a TipTap JSON body (new rich-text path) or the legacy
 * opener/message strings. TipTap JSON takes precedence when provided.
 */
function renderInviteEmail(params: {
	body?: JSONContent | null;
	opener?: string;
	message?: string;
	inviteUrl: string;
}): string {
	let bodyHtml: string;

	if (params.body) {
		bodyHtml = renderTiptapToEmailHtml(params.body);
	} else {
		const openerBlock = params.opener
			? `<p style="font-family:'SangBleu Sunrise',Georgia,serif;margin:0 0 16px;">${params.opener}</p>`
			: '';
		const messageBlock = params.message
			? `<blockquote style="font-family:'SangBleu Sunrise',Georgia,serif;margin:0 0 24px;padding:12px 16px;background:#f7f4ee;border-left:3px solid #c8c2b6;font-style:italic;color:#3a3a3a;white-space:pre-wrap;">${escapeHtml(params.message).replace(/\n/g, '<br>')}</blockquote>`
			: '';
		bodyHtml = openerBlock + messageBlock;
	}

	return buildInviteEmailHtml({
		bodyHtml,
		inviteUrl: params.inviteUrl,
		expiryDays: INVITE_EXPIRY_DAYS
	});
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
	const { email, name, message, body: richBody } = body;

	if (!email || typeof email !== 'string') {
		error(400, 'Email is required');
	}

	// Validate + trim the optional legacy message field.
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

	// Rich body from TipTap JSON (new path — takes precedence over opener/message).
	const tiptapBody =
		richBody && typeof richBody === 'object' ? (richBody as JSONContent) : null;

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
			html: renderInviteEmail({ body: tiptapBody, opener: buildOpener(name), inviteUrl, message: trimmedMessage })
		}).catch((err) => console.error('[invites] Failed to resend invite email:', err));
		addToAudience('invited', { email: email.trim() }).catch(() => {});
		await captureServer(locals.user!.id, 'invite_email_sent', {
			invited_email: email.trim(),
			resent: true,
			has_message: !!tiptapBody || !!trimmedMessage
		});
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
		html: renderInviteEmail({ body: tiptapBody, opener: buildOpener(name), inviteUrl, message: trimmedMessage })
	}).catch((err) => console.error('[invites] Failed to send invite email:', err));
	addToAudience('invited', { email: email.trim() }).catch(() => {});
	await captureServer(locals.user!.id, 'invite_email_sent', {
		invited_email: email.trim(),
		resent: false,
		has_message: !!tiptapBody || !!trimmedMessage
	});

	return json({ ok: true, inviteUrl });
};
