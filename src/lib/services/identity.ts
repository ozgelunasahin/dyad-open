import { error } from '@sveltejs/kit';
import { userToUpactor } from '@prefig/upact-supabase';
export type { Upactor } from '@prefig/upact-supabase';

/**
 * Require an authenticated identity. Throws 401 if not logged in.
 * Derives the Upactor synchronously from locals.user (already populated
 * by hooks.server.ts) — no extra substrate round-trip.
 */
export function requireIdentity(locals: App.Locals): import('@prefig/upact').Upactor {
	if (!locals.user) error(401, 'Authentication required');
	return userToUpactor(locals.user);
}
