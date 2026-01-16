import type { Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/db/operations';

const SESSION_COOKIE = 'session';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(SESSION_COOKIE);

	if (sessionId) {
		try {
			const result = await validateSession(sessionId);
			if (result) {
				event.locals.user = {
					id: result.user.id,
					email: result.user.email,
					username: result.user.username
				};
				event.locals.session = result.session;
			} else {
				// Invalid or expired session
				event.cookies.delete(SESSION_COOKIE, { path: '/' });
				event.locals.user = null;
				event.locals.session = null;
			}
		} catch (err) {
			console.error('Session validation error:', err);
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
			event.locals.user = null;
			event.locals.session = null;
		}
	} else {
		event.locals.user = null;
		event.locals.session = null;
	}

	return resolve(event);
};
