import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';
import { createSupabaseAdapter } from '@prefig/upact-supabase';
import { getAuthorizedAdminOperator } from '$lib/server/admin-auth';
import { routeKind } from '$lib/server/route-kind';

const ADMIN_HOSTNAME = 'admin.dyad.berlin';
const APEX_HOSTNAME = 'dyad.berlin';
const PAGES_PREVIEW_HOSTNAME = 'dyad-berlin.pages.dev';

export const handle: Handle = async ({ event, resolve }) => {
	// E2E_LOOPBACK admits localhost when running production builds (`vite preview`)
	// for Playwright integration. Distinct from ADMIN_DEV_BYPASS so the two
	// concerns can't be conflated by a single env var leak.
	const loopbackAdmitted = dev || env.E2E_LOOPBACK === '1';
	const kind = routeKind(event.url, {
		devMode: loopbackAdmitted,
		apexHostname: APEX_HOSTNAME,
		adminHostname: ADMIN_HOSTNAME,
		previewHostname: PAGES_PREVIEW_HOSTNAME
	});

	if (kind === 'reject') {
		return new Response(null, { status: 404 });
	}

	// Backwards compat: old apex /admin/* bookmarks redirect to the admin host.
	if (kind === 'apex-redirect') {
		const adminPath = event.url.pathname.replace(/^\/admin/, '') || '/';
		return new Response(null, {
			status: 301,
			headers: { Location: `https://${ADMIN_HOSTNAME}${adminPath}${event.url.search}` }
		});
	}

	if (kind === 'admin') {
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
			} else if (gateStatus.gated && gateStatus.groupFeedbackFormId) {
				// Group feedback (R5/U11): one simple group-level form per gathering.
				// Routed to a dedicated /feedback/group/[id] page (which is gate-exempt
				// under the /feedback prefix). Unlike the one-on-one modal path, this
				// redirects — the group form is a standalone page with no reveal state.
				if (pathname.startsWith('/api/')) {
					return new Response(JSON.stringify({ error: 'gated', groupFeedbackFormId: gateStatus.groupFeedbackFormId }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				return new Response(null, {
					status: 302,
					headers: { Location: `/feedback/group/${gateStatus.groupFeedbackFormId}` }
				});
			}
		}
	}

	return resolve(event);
};
