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

	const { email, name, freewrite } = body as Record<string, unknown>;

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
			freewrite: (typeof freewrite === 'string' ? freewrite.trim() : null) || null
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
	const resend = new Resend(env.RESEND_API_KEY);
	resend.emails.send({
		from: 'dyad. <hello@dyad.berlin>',
		to: email.trim(),
		subject: "What's in a conversation?",
		html: `
			<div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; line-height: 1.7;">
				<p>Hi ${displayName},</p>
				<p>This is Luna, one of the makers of Dyad.</p>
				<p>Dyad is a community of independent, critical thinkers who want company on shared questions, ideas, experiences and all that can be the start of a conversation. All conversations are in person, and we create the digital experience to minimize the time you spend online, and have it a joyful, ad-free and free roaming experience.</p>
				<p>Since we started with the ugly duckling version of this work, we met so many people who genuinely share our feelings for the lack of contact and connection, the way it feels meaningful, human. In conversation with these people, we are building the first full version and in the meanwhile, found other ways to experience the kind of conversations we have been looking for. This comes into life this spring in Berlin. More on that very, very soon.</p>
				<p>In the meanwhile, we welcome you with genuine joy. In a time where there is so much pressure to keep us separated, we take such joy to build other ways to come together, and contribute to oral culture as counter practice.</p>
				<p>Welcome.</p>
				<p style="margin-top: 32px;">With care,<br/>Luna</p>
				<hr style="border: none; border-top: 1px solid #e0ddd8; margin: 32px 0 16px;" />
				<p style="font-size: 12px; color: #999;">dyad.berlin — cultivating a culture of conversation</p>
			</div>
		`
	}).catch(err => console.error('Failed to send welcome email:', err));

	return json({ ok: true });
};
