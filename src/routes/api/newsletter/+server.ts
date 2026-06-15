import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(ip);
	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}
	entry.count++;
	return entry.count > RATE_LIMIT_MAX;
}

setInterval(() => {
	const now = Date.now();
	for (const [ip, entry] of rateLimitMap) {
		if (now > entry.resetAt) rateLimitMap.delete(ip);
	}
}, RATE_LIMIT_WINDOW_MS);

export const POST: RequestHandler = async ({ request, getClientAddress, locals }) => {
	let clientIp = '0.0.0.0';
	try { clientIp = getClientAddress(); } catch { /* dev environment */ }
	if (isRateLimited(clientIp)) {
		return json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { email, consent, source } = body as Record<string, unknown>;

	if (!email || typeof email !== 'string') {
		return json({ error: 'Email is required.' }, { status: 400 });
	}

	if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return json({ error: 'Invalid email address.' }, { status: 400 });
	}

	if (!consent) {
		return json({ error: 'Consent is required.' }, { status: 400 });
	}

	const resolvedSource = (typeof source === 'string' && source) ? source : 'website';

	const { error: dbError } = await locals.supabase
		.from('newsletter_subscribers')
		.insert({ email: email.trim(), source: resolvedSource });

	if (dbError) {
		if (dbError.code === '23505') {
			// Already subscribed — treat as success, don't reveal
			return json({ ok: true });
		}
		console.error('[newsletter] Failed to save subscriber:', dbError);
		return json({ error: 'Could not subscribe. Please try again.' }, { status: 500 });
	}

	return json({ ok: true });
};
