import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Simple in-memory rate limiter (per-process; sufficient for single-instance deploys)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

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

// Periodically clean stale entries to avoid unbounded memory growth
setInterval(() => {
	const now = Date.now();
	for (const [ip, entry] of rateLimitMap) {
		if (now > entry.resetAt) rateLimitMap.delete(ip);
	}
}, RATE_LIMIT_WINDOW_MS);

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const clientIp = getClientAddress();
	if (isRateLimited(clientIp)) {
		return json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { email, name } = body as Record<string, unknown>;

	if (!email || typeof email !== 'string') {
		error(400, 'Email is required');
	}

	if (email.length > 254) {
		error(400, 'Email is too long');
	}

	// Basic email validation
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		error(400, 'Invalid email address');
	}

	if (name !== undefined && typeof name !== 'string') {
		error(400, 'Name must be a string');
	}

	if (typeof name === 'string' && name.length > 200) {
		error(400, 'Name is too long');
	}

	const { error: dbError } = await locals.supabase
		.from('contacts')
		.insert({ email: email.trim(), name: (typeof name === 'string' ? name.trim() : null) || null });

	if (dbError) {
		console.error('Failed to save contact:', dbError);
		error(500, 'Failed to save contact');
	}

	return json({ ok: true });
};
