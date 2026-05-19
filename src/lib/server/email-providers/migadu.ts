import type { EmailMessage, EmailProvider } from './index.js';

// Transport unimplemented: Cloudflare Workers does not support nodemailer's net/tls
// path, so the cutover requires either worker-mailer over cloudflare:sockets or a
// MailChannels HTTPS relay. Adapter currently logs and drops.
export class MigaduEmailProvider implements EmailProvider {
	readonly name = 'migadu';

	constructor(
		private readonly _config: {
			smtpHost?: string;
			smtpUser?: string;
			smtpPass?: string;
		},
		private readonly _from: string
	) {}

	async send(_message: EmailMessage): Promise<boolean> {
		console.error('[email] Migadu adapter not implemented; email dropped');
		return false;
	}
}
