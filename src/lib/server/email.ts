import { env } from '$env/dynamic/private';

/**
 * Send an email.
 *
 * Currently a no-op stub that logs the email details.
 * For production, implement with an EU SMTP provider via fetch-based API
 * (not nodemailer, which requires Node.js built-ins incompatible with edge runtimes).
 *
 * Local dev: emails can be viewed via Mailpit at http://localhost:54324
 * when sent through Supabase Auth flows.
 *
 * Environment variables (for future implementation):
 *   EMAIL_API_URL — EU email provider API endpoint
 *   EMAIL_API_KEY — API key for the email provider
 *   EMAIL_FROM — sender address (default: hello@dyad.berlin)
 */
export async function sendEmail(params: {
	to: string;
	subject: string;
	html: string;
}): Promise<boolean> {
	const apiUrl = env.EMAIL_API_URL;
	const apiKey = env.EMAIL_API_KEY;

	if (!apiUrl || !apiKey) {
		console.log(`[email] Skipped (no EMAIL_API_URL configured): "${params.subject}" → ${params.to}`);
		return false;
	}

	const from = env.EMAIL_FROM || 'hello@dyad.berlin';

	try {
		const res = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				from,
				to: params.to,
				subject: params.subject,
				html: params.html
			})
		});

		if (!res.ok) {
			console.error('[email] API error:', res.status, await res.text());
			return false;
		}

		return true;
	} catch (err) {
		console.error('[email] Failed to send:', err);
		return false;
	}
}
