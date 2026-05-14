import { json, error } from '@sveltejs/kit';
import { sendEmail } from '$lib/server/email.js';
import { escapeHtml } from '$lib/utils/escape-html.js';
import { copy } from '$lib/copy';
import { renderWaitlistWelcomeEmail } from './render-waitlist-welcome.js';
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

	const { email, name, based_in, freewrite, expression_url, referred_by_username } = body as Record<string, unknown>;

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

	if (!freewrite || typeof freewrite !== 'string' || !freewrite.trim()) {
		return json({ error: 'Please share your thoughts before joining.' }, { status: 400 });
	}

	if (freewrite.length > 2000) {
		return json({ error: 'Freewrite is too long' }, { status: 400 });
	}

	if (typeof based_in === 'string' && based_in.length > 200) {
		error(400, 'City is too long');
	}

	if (typeof expression_url === 'string' && expression_url.trim()) {
		if (expression_url.length > 2048) error(400, 'Expression URL is too long');
		if (!/^https:\/\//.test(expression_url.trim())) error(400, 'Expression URL must start with https://');
	}

	if (typeof referred_by_username === 'string' && referred_by_username.length > 100) {
		error(400, 'Referred by username is too long');
	}

	// Short-circuit: if this email already belongs to a confirmed account,
	// don't add them to the waitlist again — direct them to log in instead.
	const { data: alreadyMember } = await locals.supabase.rpc('email_is_registered', {
		p_email: email.trim()
	});
	if (alreadyMember === true) {
		return json(
			{
				error: 'This email is already a member. Try signing in instead.',
				alreadyMember: true
			},
			{ status: 409 }
		);
	}

	const insertRow: Record<string, string | null> = {
		email: email.trim(),
		name: (typeof name === 'string' ? name.trim() : null) || null,
		based_in: (typeof based_in === 'string' ? based_in.trim() : null) || null,
		freewrite: (typeof freewrite === 'string' ? freewrite.trim() : null) || null,
	};
	if (typeof expression_url === 'string' && expression_url.trim()) {
		insertRow.expression_url = expression_url.trim();
	}
	if (typeof referred_by_username === 'string' && referred_by_username.trim()) {
		insertRow.referred_by_username = referred_by_username.trim();
	}

	let { error: dbError } = await locals.supabase.from('contacts').insert(insertRow);

	// Retry dropping any unknown columns if schema cache is stale
	if (dbError && dbError.message?.includes('column')) {
		console.error('[contact] schema error, retrying with minimal fields:', dbError.message);
		({ error: dbError } = await locals.supabase.from('contacts').insert({
			email: insertRow.email,
			name: insertRow.name,
			based_in: insertRow.based_in,
			freewrite: insertRow.freewrite,
		}));
	}

	if (dbError) {
		if (dbError.code === '23505') {
			// Unique constraint violation — already on the waitlist
			return json({ error: 'This email is already on the waitlist.' }, { status: 409 });
		}
		console.error('[contact] Failed to save contact:', dbError);
		error(500, 'Failed to save contact');
	}

	const displayName = escapeHtml((typeof name === 'string' && name.trim()) || 'there');
	await sendEmail({
		to: email.trim(),
		subject: copy.email.waitlistSubject,
		html: renderWaitlistWelcomeEmail({ displayName })
	}).catch((err) => console.error('[contact] Failed to send welcome email:', err));

	return json({ ok: true });
};
