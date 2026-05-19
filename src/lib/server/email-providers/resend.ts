import type { EmailMessage, EmailProvider } from './index.js';

export class ResendEmailProvider implements EmailProvider {
	readonly name = 'resend';

	constructor(
		private readonly apiKey: string | undefined,
		private readonly from: string
	) {}

	async send(message: EmailMessage): Promise<boolean> {
		if (!this.apiKey) {
			console.error('[email] Resend requires RESEND_API_KEY');
			return false;
		}

		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`
			},
			body: JSON.stringify({
				from: `Dyad <${this.from}>`,
				to: [message.to],
				subject: message.subject,
				html: message.html
			})
		});

		if (!res.ok) {
			console.error('[email] Resend error:', res.status, await res.text());
			return false;
		}
		return true;
	}
}
