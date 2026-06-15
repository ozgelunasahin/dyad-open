import { env } from '$env/dynamic/private';
import { sendEmail } from './email.js';
import { makeAdminClient } from './supabase-admin.js';
import { getEmailNotificationsEnabled } from './app-settings.js';
import { copy } from '$lib/copy.js';
import { escapeHtml } from '$lib/utils/escape-html.js';
import { tokens } from '$lib/design-tokens.js';
import { EMAIL_NOTIFICATIONS_DEFAULT } from '$lib/domain/types.js';

const { color, textSize, space, leading, letterSpacing } = tokens;
const SERIF = "'SangBleu Sunrise', Georgia, serif";

const SIGNATURE_FONT_FACE = `
			<style>
				@font-face {
					font-family: 'SangBleu Sunrise';
					src: url('https://dyad.berlin/fonts/SangBleuSunrise-Light-WebXL.woff2') format('woff2');
					font-weight: 300;
					font-style: normal;
					font-display: swap;
				}
				@font-face {
					font-family: 'SangBleu Sunrise';
					src: url('https://dyad.berlin/fonts/SangBleuSunrise-Regular-WebXL.woff2') format('woff2');
					font-weight: 400;
					font-style: normal;
					font-display: swap;
				}
			</style>`;

function renderSignedFooter(): string {
	const closing = escapeHtml(copy.email.signature.closing);
	const names = escapeHtml(copy.email.signature.names);
	const brand = escapeHtml(copy.email.signature.brand);
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
					<tr>
						<td style="vertical-align: middle; padding: 0 ${space[5]} 0 0;">
							<a href="https://dyad.berlin" style="display: inline-block; text-decoration: none;"><img src="https://dyad.berlin/images/logo-dark.png" alt="dyad" style="height: 48px; width: auto; display: block; border: 0;" /></a>
						</td>
						<td style="vertical-align: middle; padding: 0 0 0 ${space[5]}; border-left: 1px solid ${color.borderSubtle};">
							<p style="font-family: ${SERIF}; font-weight: 300; font-size: ${textSize.base}; line-height: ${leading.tight}; color: ${color.textSecondary}; margin: 0 0 2px;">${closing}</p>
							<p style="font-family: ${SERIF}; font-weight: 400; font-size: ${textSize.lg}; line-height: ${leading.tight}; color: ${color.textPrimary}; margin: 0 0 ${space[2]};">${names}</p>
							<p style="font-family: ${SERIF}; font-weight: 300; font-size: ${textSize.xs}; line-height: ${leading.tight}; color: ${color.textMuted}; letter-spacing: ${letterSpacing.label}; margin: 0;">${brand}</p>
						</td>
					</tr>
				</table>`;
}

function renderShell(bodyHtml: string): string {
	return `${SIGNATURE_FONT_FACE}
			<div style="font-family: Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: ${color.textPrimary}; line-height: ${leading.relaxed};">
				${bodyHtml}
				<hr style="border: none; border-top: 1px solid ${color.borderSubtle}; margin: ${space[8]} 0 ${space[4]};" />
				${renderSignedFooter()}
			</div>
		`;
}

/**
 * Defer an email-sending promise to the platform's request-extension hook.
 * On Cloudflare Workers the runtime can reap the isolate as soon as the
 * Response returns; `ctx.waitUntil` keeps it alive until the promise settles.
 * On other runtimes (dev, Node adapter) it falls back to fire-and-forget
 * with errors swallowed — dispatch() already logs.
 */
export function deferEmail(
	platform: App.Platform | undefined,
	promise: Promise<unknown>
): void {
	const waitUntil = platform?.context?.waitUntil?.bind(platform.context);
	if (waitUntil) {
		waitUntil(promise);
	} else {
		promise.catch(() => {
			// dispatch() already logs; nothing useful to do here.
		});
	}
}

/** One flag per notification family — mirrors the notification_settings
 *  columns from 20260604090000_granular_email_notification_prefs.sql. */
export interface NotificationPrefs {
	invitationReceived: boolean;
	invitationAnswered: boolean;
	meetingCancelled: boolean;
}

export interface NotificationRecipient {
	userId: string;
	email: string;
	prefs: NotificationPrefs;
}

/** Load a recipient's notification address and per-event preferences.
 *
 *  Notifications are strictly opt-in: mail goes only to an address the member
 *  has added to their notification settings — never to the auth account
 *  email. Returns null when the member has not opted in (no row, or no
 *  address), which is the normal default state, not an error. */
export async function resolveRecipient(userId: string): Promise<NotificationRecipient | null> {
	const admin = makeAdminClient();
	const { data: settings } = await admin
		.from('notification_settings')
		.select('email, invitation_received, invitation_answered, meeting_cancelled')
		.eq('user_id', userId)
		.maybeSingle();

	const email = settings?.email;
	if (!email) return null;

	return {
		userId,
		email,
		prefs: {
			invitationReceived: settings.invitation_received ?? EMAIL_NOTIFICATIONS_DEFAULT,
			invitationAnswered: settings.invitation_answered ?? EMAIL_NOTIFICATIONS_DEFAULT,
			meetingCancelled: settings.meeting_cancelled ?? EMAIL_NOTIFICATIONS_DEFAULT
		}
	};
}

interface DispatchParams {
	userId: string;
	pref: keyof NotificationPrefs;
	subject: string;
	bodyHtml: string;
}

async function dispatch(params: DispatchParams): Promise<void> {
	try {
		// Global kill switch first — checked once per send, off by default.
		// Admin plane flips this via /admin/settings; no env var, no redeploy.
		if (!(await getEmailNotificationsEnabled())) return;

		// Not opted in (no notification address) is the quiet default.
		const recipient = await resolveRecipient(params.userId);
		if (!recipient) return;
		if (!recipient.prefs[params.pref]) return;

		// Access-expired guests get no mail (plan R14) — they cannot act on
		// anything the message describes. This check lives here (not in
		// resolveRecipient) because the expiry is a profiles field, while
		// resolveRecipient reads only notification_settings.
		const admin = makeAdminClient();
		const { data: profileRow } = await admin
			.from('profiles')
			.select('access_expires_at')
			.eq('id', params.userId)
			.maybeSingle();
		if (
			profileRow?.access_expires_at &&
			new Date(profileRow.access_expires_at).getTime() < Date.now()
		) {
			return;
		}

		await sendEmail({
			to: recipient.email,
			subject: params.subject,
			html: renderShell(params.bodyHtml)
		});
	} catch (err) {
		console.error('[notification-emails] dispatch failed:', err);
	}
}

const APP_URL = 'https://dyad.berlin';

function conversationLink(promptId: string): string {
	return `${APP_URL}/conversations/${promptId}`;
}

function meetingLink(meetingId: string): string {
	return `${APP_URL}/meetings/${meetingId}`;
}

export async function notifyInvitationReceived(params: {
	authorUserId: string;
	inviterUsername?: string;
	promptId: string;
}): Promise<void> {
	const subject = escapeHtml(params.inviterUsername ?? 'Someone');
	await dispatch({
		userId: params.authorUserId,
		pref: 'invitationReceived',
		subject: 'A new invitation to meet',
		bodyHtml: `
			<p>${subject} responded to your conversation and would like to meet.</p>
			<p><a href="${conversationLink(params.promptId)}" style="color: ${color.textPrimary}; font-weight: bold; text-decoration: underline;">Open the conversation</a></p>
			<p style="font-size: ${textSize.base}; color: ${color.textMuted};">You can accept, decline, or simply read their response.</p>
		`
	});
}

export async function notifyInvitationAccepted(params: {
	inviterUserId: string;
	meetingId: string;
}): Promise<void> {
	await dispatch({
		userId: params.inviterUserId,
		pref: 'invitationAnswered',
		subject: 'Your invitation was accepted',
		bodyHtml: `
			<p>Your invitation was accepted. The meeting is scheduled.</p>
			<p><a href="${meetingLink(params.meetingId)}" style="color: ${color.textPrimary}; font-weight: bold; text-decoration: underline;">See where to meet</a></p>
		`
	});
}

export async function notifyInvitationDeclined(params: {
	inviterUserId: string;
	promptId: string;
	reason?: string | null;
}): Promise<void> {
	const reasonBlock = params.reason
		? `<blockquote style="margin: 0 0 ${space[6]}; padding: ${space[3]} ${space[4]}; background: #f7f4ee; border-left: 3px solid #c8c2b6; font-style: italic; color: ${color.textSecondary}; white-space: pre-wrap;">${escapeHtml(params.reason)}</blockquote>`
		: '';
	await dispatch({
		userId: params.inviterUserId,
		pref: 'invitationAnswered',
		subject: 'Your invitation was declined',
		bodyHtml: `
			<p>Your invitation was declined this time.</p>
			${reasonBlock}
			<p><a href="${conversationLink(params.promptId)}" style="color: ${color.textPrimary}; font-weight: bold; text-decoration: underline;">Back to the conversation</a></p>
		`
	});
}

export async function notifyMeetingCancelled(params: {
	remainingParticipantUserId: string;
	meetingId: string;
	reason?: string | null;
}): Promise<void> {
	const reasonBlock = params.reason
		? `<blockquote style="margin: 0 0 ${space[6]}; padding: ${space[3]} ${space[4]}; background: #f7f4ee; border-left: 3px solid #c8c2b6; font-style: italic; color: ${color.textSecondary}; white-space: pre-wrap;">${escapeHtml(params.reason)}</blockquote>`
		: '';
	await dispatch({
		userId: params.remainingParticipantUserId,
		pref: 'meetingCancelled',
		subject: 'A meeting was cancelled',
		bodyHtml: `
			<p>The other person cancelled.</p>
			${reasonBlock}
			<p><a href="${meetingLink(params.meetingId)}" style="color: ${color.textPrimary}; font-weight: bold; text-decoration: underline;">See the meeting</a></p>
		`
	});
}

/** Selective cancellation: the host cancelled THIS recipient's meeting, but
 *  the time itself was not withdrawn — never claim the gathering is off. */
export async function notifySpotCancelled(params: {
	joinerUserId: string;
	meetingId: string;
	reason?: string | null;
}): Promise<void> {
	const reasonBlock = params.reason
		? `<blockquote style="margin: 0 0 ${space[6]}; padding: ${space[3]} ${space[4]}; background: #f7f4ee; border-left: 3px solid #c8c2b6; font-style: italic; color: ${color.textSecondary}; white-space: pre-wrap;">${escapeHtml(params.reason)}</blockquote>`
		: '';
	await dispatch({
		userId: params.joinerUserId,
		pref: 'meetingCancelled',
		subject: 'Your meeting was cancelled',
		bodyHtml: `
			<p>The host cancelled your meeting.</p>
			${reasonBlock}
			<p><a href="${meetingLink(params.meetingId)}" style="color: ${color.textPrimary}; font-weight: bold; text-decoration: underline;">See the details</a></p>
		`
	});
}

/** Whole-gathering cancellation: the host called the time off — group-framed
 *  body (the recipient's pair-meeting link still works for the record). */
export async function notifyGatheringCancelled(params: {
	joinerUserId: string;
	meetingId: string;
	reason?: string | null;
}): Promise<void> {
	const reasonBlock = params.reason
		? `<blockquote style="margin: 0 0 ${space[6]}; padding: ${space[3]} ${space[4]}; background: #f7f4ee; border-left: 3px solid #c8c2b6; font-style: italic; color: ${color.textSecondary}; white-space: pre-wrap;">${escapeHtml(params.reason)}</blockquote>`
		: '';
	await dispatch({
		userId: params.joinerUserId,
		pref: 'meetingCancelled',
		subject: 'A gathering was called off',
		bodyHtml: `
			<p>The host called off the gathering — this time is no longer happening.</p>
			${reasonBlock}
			<p><a href="${meetingLink(params.meetingId)}" style="color: ${color.textPrimary}; font-weight: bold; text-decoration: underline;">See the details</a></p>
		`
	});
}

// Multi-invite courtesy: when a new accept lands on a slot that already has
// other accepted participants. Off by default. The flag stays unset until the
// product decision is made.
function multiInviteCourtesyEnabled(): boolean {
	return env.MULTI_INVITE_COURTESY_EMAIL === '1';
}

export async function notifyMultiInviteCourtesy(params: {
	existingParticipantUserIds: string[];
	meetingId: string;
}): Promise<void> {
	if (!multiInviteCourtesyEnabled()) return;
	await Promise.all(
		params.existingParticipantUserIds.map((userId) =>
			dispatch({
				userId,
				// Rides the meeting flag for now; if this courtesy ever turns on
				// (MULTI_INVITE_COURTESY_EMAIL=1) it deserves its own preference.
				pref: 'meetingCancelled',
				subject: 'Someone else is joining your meeting',
				bodyHtml: `
					<p>Another person accepted an invitation for the same time and place as your meeting.</p>
					<p><a href="${meetingLink(params.meetingId)}" style="color: ${color.textPrimary}; font-weight: bold; text-decoration: underline;">See the meeting</a></p>
				`
			})
		)
	);
}
