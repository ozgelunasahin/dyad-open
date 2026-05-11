import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import { createSupabaseAdapter } from '@prefig/upact-supabase';
import { getAuthorizedAdminOperator } from '$lib/server/admin-auth';

const ADMIN_HOSTNAME = 'admin.dyad.berlin';
const APEX_HOSTNAME = 'dyad.berlin';

export const handle: Handle = async ({ event, resolve }) => {
	// Backwards compat: dyad.berlin/admin/* redirects to admin.dyad.berlin/*
	// so the admin plane is reachable only via its own hostname. Old bookmarks
	// keep working but land in the right place.
	if (event.url.hostname === APEX_HOSTNAME && event.url.pathname.startsWith('/admin')) {
		const adminPath = event.url.pathname.replace(/^\/admin/, '') || '/';
		return new Response(null, {
			status: 301,
			headers: { Location: `https://${ADMIN_HOSTNAME}${adminPath}${event.url.search}` }
		});
	}

	// Admin plane: gated by Cloudflare Access at admin.dyad.berlin. The reroute
	// hook (src/hooks.ts) maps admin.dyad.berlin/foo → /admin/foo internally so
	// existing route files keep working. We authorize based on hostname (production)
	// or /admin/* path (local dev, where there's no subdomain).
	const isAdminRequest =
		event.url.hostname === ADMIN_HOSTNAME || event.url.pathname.startsWith('/admin');

	if (isAdminRequest) {
		const operator = await getAuthorizedAdminOperator(event.request);
		if (!operator) {
			return new Response(
				'Admin access requires Cloudflare Access authentication.',
				{ status: 401, headers: { 'Content-Type': 'text/plain' } }
			);
		}
		return resolve(event);
	}

	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/', secure: dev ? false : options?.secure });
				});
			}
		}
	});
	event.locals.identityPort = createSupabaseAdapter(event.locals.supabase);

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

	// TODO (Phase E): replace safeGetSession() with identityPort.currentUpactor(event.request)
	// so per-request identity resolves through the port rather than calling Supabase Auth
	// directly. Requires: (1) locals.upactor: Upactor | null added to App.Locals,
	// (2) feedback gate uses upactor.id.
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;
	event.locals.scopes = [];

	// Redirect old /prompts/ URLs to /conversations/
	if (event.url.pathname.startsWith('/prompts/')) {
		const newPath = event.url.pathname.replace('/prompts/', '/conversations/') + event.url.search;
		return new Response(null, { status: 302, headers: { Location: newPath } });
	}

	// Feedback gate: block app access when user has due feedback
	if (user) {
		const pathname = event.url.pathname;

		// Skip gate for static assets, auth routes, feedback routes, and admin.
		// The same exemption list applies to the scope-membership query below —
		// avoids running an extra DB query on every static-asset request.
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
			pathname.startsWith('/favicon') ||
			pathname.startsWith('/impressum') ||
			pathname.startsWith('/datenschutz');

		if (!isExempt) {
			// Load active scope memberships once per request. The discover-feed
			// query and the public profile query in prompt-query.ts read this
			// to gate scoped prompts. See migration 20260508180000 for the
			// scope primitive; identity_scopes RLS limits SELECT to own rows.
			const { data: scopeRows } = await event.locals.supabase
				.from('identity_scopes')
				.select('scope')
				.eq('identity_id', user.id)
				.is('revoked_at', null);
			event.locals.scopes = (scopeRows ?? []).map((r) => r.scope as string);

			// Advance any meetings whose scheduled_time has passed — creates feedback_forms with state='due'
			try { await event.locals.supabase.rpc('advance_scheduled_meetings'); } catch { /* fail open */ }

			const { SupabaseGateService } = await import('$lib/services/gate.js');
			const gateService = new SupabaseGateService(event.locals.supabase);
			const gateStatus = await gateService.checkGate(user.id);

			if (gateStatus.gated && gateStatus.feedbackFormId) {
				if (pathname.startsWith('/api/')) {
					return new Response(JSON.stringify({ error: 'gated', feedbackFormId: gateStatus.feedbackFormId }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				// Store in locals so the layout renders the feedback modal instead of redirecting
				(event.locals as any).pendingFeedbackFormId = gateStatus.feedbackFormId;
			}
		}
	}

	return resolve(event);
};
