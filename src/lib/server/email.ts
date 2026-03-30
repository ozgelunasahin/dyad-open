import { env } from '$env/dynamic/private';

/**
 * Send an email via HTTP API.
 *
 * Local dev (default): Mailpit HTTP API at http://localhost:54324/api/v1/send
 *   → emails viewable at http://localhost:54324
 * Production: Mailjet Send API v3.1 (EU-hosted, sovereignty-compliant)
 *
 * Environment variables:
 *   EMAIL_PROVIDER  — 'mailpit' (default) or 'mailjet'
 *   EMAIL_API_KEY   — Mailjet public API key (required for mailjet)
 *   EMAIL_API_SECRET — Mailjet private API secret (required for mailjet)
 *   EMAIL_FROM      — sender address (default: hello@dyad.berlin)
 */
export async function sendEmail(params: {
	to: string;
	subject: string;
	html: string;
}): Promise<boolean> {
	const provider = env.EMAIL_PROVIDER ?? 'mailpit';
	const from = env.EMAIL_FROM || 'hello@dyad.berlin';

	try {
		if (provider === 'mailjet') {
			const apiKey = env.EMAIL_API_KEY;
			const apiSecret = env.EMAIL_API_SECRET;
			if (!apiKey || !apiSecret) {
				console.error('[email] Mailjet requires EMAIL_API_KEY and EMAIL_API_SECRET');
				return false;
			}

			const res = await fetch('https://api.mailjet.com/v3.1/send', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Basic ' + btoa(`${apiKey}:${apiSecret}`)
				},
				body: JSON.stringify({
					Messages: [{
						From: { Email: from, Name: 'dyad.' },
						To: [{ Email: params.to }],
						Subject: params.subject,
						HTMLPart: params.html
					}]
				})
			});

			if (!res.ok) {
				console.error('[email] Mailjet error:', res.status, await res.text());
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
				From: { Email: from, Name: 'dyad.' },
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
