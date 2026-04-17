import { json } from '@sveltejs/kit';
import { DomainError } from '$lib/domain/errors.js';

/**
 * Shared catch-block helper for /api/ handlers.
 *
 * - DomainError: message is safe; return it with the attached status.
 * - Anything else: log the real error server-side with a short reference ID,
 *   return a generic 500 including that same reference so testers can cite it
 *   and maintainers can grep logs.
 *
 * This is the single seam that stops Supabase / Postgres error messages (table
 * names, constraint names, RLS logic) from reaching API clients, while
 * preserving the ability to diagnose 500s in production.
 */
export function handleServiceError(err: unknown, scope: string): Response {
	if (err instanceof DomainError) {
		return json({ error: err.message }, { status: err.status });
	}
	const reference = generateReference();
	console.error(`${scope} (ref ${reference}) unexpected error:`, err);
	return json(
		{ error: 'Something went wrong', reference },
		{ status: 500 }
	);
}

/**
 * 8-char lowercase alphanumeric. Not cryptographic — just enough to find a
 * specific request in Cloudflare Workers logs or to match against a user's
 * feedback submission.
 */
function generateReference(): string {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let out = '';
	for (let i = 0; i < 8; i++) {
		out += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return out;
}
