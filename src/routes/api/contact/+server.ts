import { json, error } from '@sveltejs/kit';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
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

	const { email, name, based_in, freewrite, expression_url, expression_file_url } = body as Record<string, unknown>;

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

	const { error: dbError } = await locals.supabase
		.from('contacts')
		.insert({
			email: email.trim(),
			name: (typeof name === 'string' ? name.trim() : null) || null,
			based_in: (typeof based_in === 'string' ? based_in.trim() : null) || null,
			freewrite: (typeof freewrite === 'string' ? freewrite.trim() : null) || null,
			expression_url: (typeof expression_url === 'string' ? expression_url.trim() : null) || null,
			expression_file_url: (typeof expression_file_url === 'string' ? expression_file_url.trim() : null) || null
		});

	if (dbError) {
		if (dbError.code === '23505') {
			// Unique constraint violation — already on the waitlist
			return json({ error: 'This email is already on the waitlist.' }, { status: 409 });
		}
		console.error('Failed to save contact:', dbError);
		error(500, 'Failed to save contact');
	}

	// Send welcome email (fire-and-forget — don't block the response)
	const displayName = (typeof name === 'string' && name.trim()) || 'there';
	if (env.RESEND_API_KEY) {
		const resend = new Resend(env.RESEND_API_KEY);
		try {
			await resend.emails.send({
				from: 'dyad. <hello@dyad.berlin>',
				to: email.trim(),
				subject: "What's in a conversation?",
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
						<a href="https://dyad.berlin" style="display: inline-block;"><img src="https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/logo%20dark.png" alt="dyad" style="height: 32px; width: auto; margin-bottom: 8px;" /></a>
						<p style="font-size: 12px; color: #999; margin: 0;">cultivating a culture of conversation</p>
					</div>
				`
			});
		} catch (err) {
			console.error('[contact] Failed to send welcome email:', err);
		}
	}

	return json({ ok: true });
};
