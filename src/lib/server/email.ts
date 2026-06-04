import { env } from '$env/dynamic/private';
import {
	MailpitEmailProvider,
	MigaduEmailProvider,
	ResendEmailProvider,
	type EmailMessage,
	type EmailProvider
} from './email-providers/index.js';

const DEFAULT_FROM = 'hello@dyad.berlin';
const DEFAULT_MAILPIT_URL = 'http://localhost:54324/api/v1/send';

function resolveProvider(): EmailProvider {
	const from = env.EMAIL_FROM || DEFAULT_FROM;
	const name = env.EMAIL_PROVIDER || 'mailpit';

	switch (name) {
		case 'resend':
			return new ResendEmailProvider(env.RESEND_API_KEY, from);
		case 'migadu':
			return new MigaduEmailProvider(
				{
					smtpHost: env.MIGADU_SMTP_HOST,
					smtpUser: env.MIGADU_SMTP_USER,
					smtpPass: env.MIGADU_SMTP_PASS
				},
				from
			);
		case 'mailpit':
			return new MailpitEmailProvider(env.EMAIL_API_URL || DEFAULT_MAILPIT_URL, from);
		default:
			console.error(`[email] unknown EMAIL_PROVIDER=${name}, falling back to mailpit`);
			return new MailpitEmailProvider(env.EMAIL_API_URL || DEFAULT_MAILPIT_URL, from);
	}
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
	const provider = resolveProvider();
	// Deliberately no recipient in the log line — the notification address is
	// opt-in PII (notification_settings) and logs have a different
	// access/retention boundary than the database.
	console.error(`[email] provider=${provider.name}`);
	try {
		return await provider.send(message);
	} catch (err) {
		console.error('[email] Failed to send:', err);
		return false;
	}
}

export type { EmailMessage } from './email-providers/index.js';
