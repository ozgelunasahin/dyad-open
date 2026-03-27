import { error } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';

/**
 * Require an authenticated user. Throws 401 if not logged in.
 * Returns the user for convenient destructuring.
 */
export function requireAuth(user: User | null): User {
	if (!user) {
		error(401, 'Authentication required');
	}
	return user;
}
