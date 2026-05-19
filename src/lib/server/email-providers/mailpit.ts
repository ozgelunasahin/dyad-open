import type { EmailMessage, EmailProvider } from './index.js';

export class MailpitEmailProvider implements EmailProvider {
	readonly name = 'mailpit';

	constructor(
		private readonly apiUrl: string,
		private readonly from: string
	) {}

	async send(message: EmailMessage): Promise<boolean> {
		const res = await fetch(this.apiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				From: { Email: this.from, Name: 'Dyad' },
				To: [{ Email: message.to }],
				Subject: message.subject,
				HTML: message.html
			})
		});

		if (!res.ok) {
			console.error('[email] Mailpit error:', res.status, await res.text());
			return false;
		}
		return true;
	}
}
