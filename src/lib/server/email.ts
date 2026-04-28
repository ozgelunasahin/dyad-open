import { env } from '$env/dynamic/private';

/**
 * Send an email via HTTP API.
 *
 * Local dev (default): Mailpit HTTP API at http://localhost:54324/api/v1/send
 *   → emails viewable at http://localhost:54324
 * Production: Resend API (https://resend.com)
 *
 * NOTE: Resend is a US company. For sovereignty compliance (see docs/design/
 * shared-infrastructure-opportunities.md), plan to migrate to an EU-hosted
 * provider (Mailjet, Postal, or similar) before v0.2. The provider abstraction
 * here (EMAIL_PROVIDER switch) makes this a config change + body format swap.
 *
 * Environment variables:
 *   EMAIL_PROVIDER   — 'mailpit' (default) or 'resend'
 *   RESEND_API_KEY   — Resend API key (required for resend)
 *   EMAIL_FROM       — sender address (default: hello@dyadberlin)
 */
export async function sendEmail(params: {
	to: string;
	subject: string;
	html: string;
}): Promise<boolean> {
	const provider = env.EMAIL_PROVIDER ?? 'mailpit';
	const from = env.EMAIL_FROM || 'hello@dyad.berlin';

	console.error(`[email] provider=${provider} to=${params.to}`);

	try {
		if (provider === 'resend') {
			const apiKey = env.RESEND_API_KEY;
			if (!apiKey) {
				console.error('[email] Resend requires RESEND_API_KEY');
				return false;
			}

			const res = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`
				},
				body: JSON.stringify({
					from: `Dyad <${from}>`,
					to: [params.to],
					subject: params.subject,
					html: params.html
				})
			});

			if (!res.ok) {
				console.error('[email] Resend error:', res.status, await res.text());
				return false;
			}
			return true;
		}

		// Default: Mailpit (local dev)
		const apiUrl = env.EMAIL_API_URL || 'http://localhost:54324/api/v1/send';
		const res = await fetch(apiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				From: { Email: from, Name: 'Dyad' },
				To: [{ Email: params.to }],
				Subject: params.subject,
				HTML: params.html
			})
		});

		if (!res.ok) {
			console.error('[email] Mailpit error:', res.status, await res.text());
			return false;
		}
		return true;
	} catch (err) {
		console.error('[email] Failed to send:', err);
		return false;
	}
}
