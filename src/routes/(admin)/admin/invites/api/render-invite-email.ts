import { escapeHtml } from '$lib/utils/escape-html.js';
import { copy } from '$lib/copy';
import { tokens } from '$lib/design-tokens.js';

const { color, textSize, space, leading, letterSpacing } = tokens;
const SERIF = "'SangBleu Sunrise', Georgia, serif";

// Font URLs are absolute because email clients have no relative-URL context.
// Files self-hosted on dyad.berlin/fonts/* (mirror of static/fonts/).
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

// Table layout because Outlook does not reliably render flex/grid.
// border-collapse + mso-* are Outlook hygiene; without them Outlook injects stray whitespace and borders.
function renderSignedFooter(closing: string, names: string): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
					<tr>
						<td style="vertical-align: middle; padding: 0 ${space[5]} 0 0;">
							<a href="https://dyad.berlin" style="display: inline-block; text-decoration: none;"><img src="https://dyad.berlin/images/logo-dark.png" alt="dyad" style="height: 48px; width: auto; display: block; border: 0;" /></a>
						</td>
						<td style="vertical-align: middle; padding: 0 0 0 ${space[5]}; border-left: 1px solid ${color.borderSubtle};">
							<p style="font-family: ${SERIF}; font-weight: 300; font-size: ${textSize.base}; line-height: ${leading.tight}; color: ${color.textSecondary}; margin: 0 0 2px;">${closing}</p>
							<p style="font-family: ${SERIF}; font-weight: 400; font-size: ${textSize.lg}; line-height: ${leading.tight}; color: ${color.textPrimary}; margin: 0 0 ${space[2]};">${names}</p>
							<p style="font-family: ${SERIF}; font-weight: 300; font-size: ${textSize.xs}; line-height: ${leading.tight}; color: ${color.textMuted}; letter-spacing: ${letterSpacing.label}; margin: 0;">${copy.email.signature.brand}</p>
						</td>
					</tr>
				</table>`;
}

/**
 * Render the invitation email body.
 *
 * `opener` is the admin's own opening line — e.g. "Hey —" or "Hi friend,".
 * Rendered verbatim (no "Hi " prefix). Omit entirely when empty.
 *
 * `message` (when non-empty) is a quoted block beneath the opener.
 *
 * `signatureClosing` and `signatureNames` override the two voice-bearing
 * lines in the footer. Both default to copy.email.signature.* when omitted.
 * The brand line ("dyad · berlin") is not overridable.
 *
 * All four optional text fields are HTML-escaped inside this function;
 * callers pass raw text. Line breaks in the message are preserved as <br> tags.
 */
export function renderInviteEmail(params: {
	opener?: string;
	inviteUrl: string;
	message?: string;
	expiryDays: number;
	signatureClosing?: string;
	signatureNames?: string;
}): string {
	const openerBlock = params.opener
		? `\n\t\t\t\t<p>${escapeHtml(params.opener)}</p>`
		: '';
	const personalBlock = params.message
		? `
				<blockquote style="margin: 0 0 ${space[6]}; padding: ${space[3]} ${space[4]}; background: #f7f4ee; border-left: 3px solid #c8c2b6; font-style: italic; color: ${color.textSecondary}; white-space: pre-wrap;">${escapeHtml(
					params.message
				).replace(/\n/g, '<br>')}</blockquote>`
		: '';

	const closing = escapeHtml(params.signatureClosing?.trim() || copy.email.signature.closing);
	const names = escapeHtml(params.signatureNames?.trim() || copy.email.signature.names);

	return `${SIGNATURE_FONT_FACE}
			<div style="font-family: Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: ${color.textPrimary}; line-height: ${leading.relaxed};">${openerBlock}${personalBlock}
				<p><a href="${params.inviteUrl}" style="color: ${color.textPrimary}; font-weight: bold; text-decoration: underline;">Join dyad</a></p>
				<p style="font-size: ${textSize.base}; color: ${color.textMuted};">This link expires in ${params.expiryDays} days.</p>
				<hr style="border: none; border-top: 1px solid ${color.borderSubtle}; margin: ${space[8]} 0 ${space[4]};" />
				${renderSignedFooter(closing, names)}
			</div>
		`;
}
