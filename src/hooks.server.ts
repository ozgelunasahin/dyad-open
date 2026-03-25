import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	// Populate user and session for convenience
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	// Feedback gate: block app access when user has due feedback
	if (user) {
		const pathname = event.url.pathname;

		// Skip gate for static assets, auth routes, and feedback routes
		const isExempt =
			pathname.startsWith('/_app/') ||
			pathname.startsWith('/feedback') ||
			pathname.startsWith('/api/feedback') ||
			pathname.startsWith('/api/auth') ||
			pathname.startsWith('/api/vocabulary') ||
			pathname.startsWith('/auth') ||
			pathname.startsWith('/logout') ||
			pathname.endsWith('.webmanifest') ||
			pathname.startsWith('/service-worker') ||
			pathname.startsWith('/favicon');

		if (!isExempt) {
			try {
				const { data: gatedForm } = await event.locals.supabase
					.from('feedback_forms')
					.select('id')
					.eq('reviewer_id', user.id)
					.eq('state', 'due')
					.limit(1)
					.maybeSingle();

				if (gatedForm) {
					if (pathname.startsWith('/api/')) {
						return new Response(JSON.stringify({ error: 'gated', feedbackFormId: gatedForm.id }), {
							status: 403,
							headers: { 'Content-Type': 'application/json' }
						});
					}
					return new Response(null, {
						status: 303,
						headers: { Location: `/feedback/${gatedForm.id}` }
					});
				}
			} catch {
				// Gate check failed — fail open, don't block the user
			}
		}
	}

	return resolve(event);
};
