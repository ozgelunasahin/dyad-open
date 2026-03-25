import { env } from '$env/dynamic/private';

/**
 * Send an email via HTTP API.
 *
 * Local dev: uses Mailpit HTTP API at http://localhost:54324/api/v1/send
 *   → emails viewable at http://localhost:54324
 * Production: uses any EU email provider with an HTTP API (Mailjet, etc.)
 *
 * Environment variables:
 *   EMAIL_API_URL — email API endpoint (default: Mailpit local)
 *   EMAIL_API_KEY — API key (optional for Mailpit, required for production)
 *   EMAIL_FROM — sender address (default: hello@dyad.berlin)
 */
export async function sendEmail(params: {
	to: string;
	subject: string;
	html: string;
}): Promise<boolean> {
	const apiUrl = env.EMAIL_API_URL || 'http://localhost:54324/api/v1/send';
	const apiKey = env.EMAIL_API_KEY;
	const from = env.EMAIL_FROM || 'hello@dyad.berlin';

	try {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (apiKey) {
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		// Mailpit uses a specific JSON format; production providers may differ.
		// For now, use Mailpit's format. When adding a production provider,
		// add a conditional based on the API URL or a separate EMAIL_PROVIDER env var.
		const body = JSON.stringify({
			From: { Email: from, Name: 'dyad.' },
			To: [{ Email: params.to }],
			Subject: params.subject,
			HTML: params.html
		});

		const res = await fetch(apiUrl, { method: 'POST', headers, body });

		if (!res.ok) {
			console.error('[email] API error:', res.status, await res.text());
			return false;
		}

		return true;
	} catch (err) {
		// Fail silently — email delivery shouldn't block the request
		console.error('[email] Failed to send:', err);
		return false;
	}
}
