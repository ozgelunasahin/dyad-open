import type { EmailMessage, EmailProvider } from './index.js';

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
