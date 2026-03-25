import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

/**
 * Send an email via SMTP.
 * Local dev: Mailpit on localhost:54325 (captured at http://localhost:54324)
 * Production: any EU SMTP provider (Mailjet, Postal, etc.)
 *
 * Environment variables:
 *   SMTP_HOST (default: localhost)
 *   SMTP_PORT (default: 54325 for Mailpit)
 *   SMTP_USER (optional)
 *   SMTP_PASS (optional)
 *   SMTP_FROM (default: hello@dyad.berlin)
 */
export async function sendEmail(params: {
	to: string;
	subject: string;
	html: string;
}): Promise<boolean> {
	const host = env.SMTP_HOST || 'localhost';
	const port = parseInt(env.SMTP_PORT || '54325', 10);
	const user = env.SMTP_USER;
	const pass = env.SMTP_PASS;
	const from = env.SMTP_FROM || 'hello@dyad.berlin';

	// Skip if no SMTP configured and not localhost (backward compat with Resend guard)
	if (host !== 'localhost' && !user) {
		console.log('[email] SMTP not configured, skipping send');
		return false;
	}

	try {
		const transport = nodemailer.createTransport({
			host,
			port,
			secure: port === 465,
			...(user && pass ? { auth: { user, pass } } : {})
		});

		await transport.sendMail({
			from,
			to: params.to,
			subject: params.subject,
			html: params.html
		});

		return true;
	} catch (err) {
		console.error('[email] Failed to send:', err);
		return false;
	}
}
