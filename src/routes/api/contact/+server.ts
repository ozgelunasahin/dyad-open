import { json, error } from '@sveltejs/kit';
import { sendEmail } from '$lib/server/email.js';
import { addToAudience } from '$lib/server/resend-contacts.js';
import { escapeHtml } from '$lib/utils/escape-html.js';
import { copy } from '$lib/copy';
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

	const { email, name, based_in, freewrite, expression_url, referred_by_username, referral_source } = body as Record<string, unknown>;

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

	const insertRow: Record<string, string | null> = {
		email: email.trim(),
		name: (typeof name === 'string' ? name.trim() : null) || null,
		based_in: (typeof based_in === 'string' ? based_in.trim() : null) || null,
		freewrite: (typeof freewrite === 'string' ? freewrite.trim() : null) || null,
		referral_source: (typeof referral_source === 'string' ? referral_source.trim() : null) || null,
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

	const firstName = (typeof name === 'string' && name.trim()) || undefined;
	addToAudience('waitlist', { email: email.trim(), firstName }).catch(() => {});

	const displayName = escapeHtml(firstName || 'there');
	await sendEmail({
		to: email.trim(),
		subject: copy.email.waitlistSubject,
		html: `
			<div style="font-family: Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; line-height: 1.7;">
				<p>Hi ${displayName},</p>
				<p>This question has been one that animated our path in building a piece of social technology as civic infrastructure. So naturally, Dyad became a community of and for people who want company on shared questions, ideas, experiences and all that can be the start of a conversation. All conversations are in person, and we create the digital experience to minimize the time you spend online, and have it a joyful, ad-free roaming experience.</p>
				<p>Since we started with the ugly duckling version of this work, we met so many people who genuinely share our feelings for what a conversation can be: enlivening, insightful, presencing, meaningful, connecting; human. In conversation with these people as our early users, we are currently at work building the app you can use to come across those who resonate, who share what you have in mind with a different vantage point.</p>
				<p>In the meanwhile, we found another way to experience the kind of conversations we have been longing for. Weaving, our public conversation series, is coming to life with its first season this spring in Berlin. More on this very, very soon.</p>
				<p>You are on our waitlist and can expect to hear from us within the next 7 days.</p>
				<p>We are looking forward to meeting you for a conversation.</p>
				<p style="margin-top: 32px;">With care,<br/>Luna</p>
				<hr style="border: none; border-top: 1px solid #e0ddd8; margin: 32px 0 16px;" />
				<a href="https://dyad.berlin" style="display: inline-block;"><img src="https://dyad.berlin/images/logo-dark.png" alt="dyad" style="height: 32px; width: auto; margin-bottom: 8px;" /></a>
				<p style="font-size: 12px; color: #999; margin: 0;">cultivating a culture of conversation</p>
			</div>
		`
	}).catch((err) => console.error('[contact] Failed to send welcome email:', err));

	return json({ ok: true });
};
