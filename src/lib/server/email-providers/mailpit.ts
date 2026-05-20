import type { EmailMessage, EmailProvider } from './index.js';

const SEND_TIMEOUT_MS = 10_000;

export class MailpitEmailProvider implements EmailProvider {
	readonly name = 'mailpit';

	constructor(
		private readonly apiUrl: string,
		private readonly from: string
	) {}

	async send(message: EmailMessage): Promise<boolean> {
		let res: Response;
		try {
			res = await fetch(this.apiUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					From: { Email: this.from, Name: 'Dyad' },
					To: [{ Email: message.to }],
					Subject: message.subject,
					HTML: message.html
				}),
				signal: AbortSignal.timeout(SEND_TIMEOUT_MS)
			});
		} catch (err) {
			console.error('[email] Mailpit fetch failed:', err);
			return false;
		}

		if (!res.ok) {
			console.error('[email] Mailpit error:', res.status, await res.text());
			return false;
		}
		return true;
	}
}
