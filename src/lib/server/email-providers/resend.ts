import type { EmailMessage, EmailProvider } from './index.js';

const SEND_TIMEOUT_MS = 10_000;

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

		let res: Response;
		try {
			res = await fetch('https://api.resend.com/emails', {
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
				}),
				signal: AbortSignal.timeout(SEND_TIMEOUT_MS)
			});
		} catch (err) {
			console.error('[email] Resend fetch failed:', err);
			return false;
		}

		if (!res.ok) {
			console.error('[email] Resend error:', res.status, await res.text());
			return false;
		}
		return true;
	}
}
