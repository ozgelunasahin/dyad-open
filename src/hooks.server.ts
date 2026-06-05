import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';
import { createSupabaseAdapter } from '@prefig/upact-supabase';
import { getAuthorizedAdminOperator } from '$lib/server/admin-auth';
import { routeKind } from '$lib/server/route-kind';
import { firstAccessContextRow } from '$lib/server/access-context';

const ADMIN_HOSTNAME = 'admin.dyad.berlin';
const APEX_HOSTNAME = 'dyad.berlin';
const PAGES_PREVIEW_HOSTNAME = 'dyad-berlin.pages.dev';
// Conference host: dyad.amsterdam serves the app itself (attach the domain
// — and www — to the Pages project). Sessions are host-scoped cookies, so
// guests who join there live their whole corner experience under this
// hostname. Joining still requires a generated group link — the QR encodes
// the full join URL (https://dyad.amsterdam/join?glink=<token>); an
// anonymous visitor on the bare domain is redirected to the Berlin apex,
// so possession of the link is the gate. The www variant canonicalizes
// onto the bare host.
const AMSTERDAM_HOSTNAME = 'dyad.amsterdam';
const SECONDARY_APEX_HOSTNAMES = [AMSTERDAM_HOSTNAME];
const ALIAS_HOSTNAMES = ['www.dyad.amsterdam'];

// Region a hostname puts a signed-in member into. A multi-region member
// (grants in several corners across cities) browsing dyad.amsterdam should
// see the Amsterdam region — its commons plus the Amsterdam corners they
// hold — not the Berlin default. Region keys index the registry in
// location.ts. Hosts absent here use the default region.
const HOST_REGIONS: Record<string, string> = {
	[AMSTERDAM_HOSTNAME]: 'amsterdam'
};

export const handle: Handle = async ({ event, resolve }) => {
	// E2E_LOOPBACK admits localhost when running production builds (`vite preview`)
	// for Playwright integration. Distinct from ADMIN_DEV_BYPASS so the two
	// concerns can't be conflated by a single env var leak.
	const loopbackAdmitted = dev || env.E2E_LOOPBACK === '1';
	const kind = routeKind(event.url, {
		devMode: loopbackAdmitted,
		apexHostname: APEX_HOSTNAME,
		adminHostname: ADMIN_HOSTNAME,
		previewHostname: PAGES_PREVIEW_HOSTNAME,
		secondaryApexHostnames: SECONDARY_APEX_HOSTNAMES,
		aliasHostnames: ALIAS_HOSTNAMES
	});

	if (kind === 'reject') {
		return new Response(null, { status: 404 });
	}

	// www.dyad.amsterdam canonicalizes onto the bare conference host,
	// path preserved. 302 (not 301) — the host setup may still evolve.
	if (kind === 'alias-redirect') {
		return new Response(null, {
			status: 302,
			headers: {
				Location: `https://${AMSTERDAM_HOSTNAME}${event.url.pathname}${event.url.search}`
			}
		});
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
	event.locals.homeScope = null;
	event.locals.homeRegion = null;
	event.locals.accessExpiresAt = null;
	// Host-derived region (null = default/berlin). Available without a session
	// — it's purely the hostname — so loaders can switch a member's region
	// context to match the domain they arrived on.
	event.locals.hostRegion = HOST_REGIONS[event.url.hostname.replace(/\.$/, '')] ?? null;

	// Redirect old /prompts/ URLs to /conversations/
	if (event.url.pathname.startsWith('/prompts/')) {
		const newPath = event.url.pathname.replace('/prompts/', '/conversations/') + event.url.search;
		return new Response(null, { status: 302, headers: { Location: newPath } });
	}

	// An anonymous visitor on the conference host's bare domain has nothing
	// to do there — without a join link, dyad.amsterdam redirects to the
	// Berlin apex. Signed-in guests (!user guard) and the QR's
	// /join?glink=... path are unaffected.
	if (
		!user &&
		event.url.pathname === '/' &&
		event.url.hostname.replace(/\.$/, '') === AMSTERDAM_HOSTNAME
	) {
		return new Response(null, {
			status: 302,
			headers: { Location: `https://${APEX_HOSTNAME}/` }
		});
	}

	// Feedback gate: block app access when user has due feedback
	if (user) {
		const pathname = event.url.pathname;

		// Exemption list — load-bearing for THREE concerns that all live in the
		// non-exempt block below: (1) the per-request context/scope query,
		// (2) the access gate (expired guests), (3) the feedback gate. A path
		// listed here skips all three. When adding a path, consider each
		// concern: an expired guest must always be able to reach auth routes
		// (/auth, /api/auth, /logout), the legal pages, the access-ended page
		// itself, and static assets — otherwise they cannot even log out or
		// read the privacy policy.
		const isExempt =
			pathname.startsWith('/_app/') ||
			pathname.startsWith('/feedback') ||
			pathname.startsWith('/api/feedback') ||
			pathname.startsWith('/api/auth') ||
			pathname.startsWith('/api/vocabulary') ||
			pathname.startsWith('/auth') ||
			pathname.startsWith('/logout') ||
			pathname.startsWith('/access-ended') ||
			pathname.endsWith('.webmanifest') ||
			pathname.startsWith('/service-worker') ||
			pathname.startsWith('/favicon') ||
			pathname.startsWith('/impressum') ||
			pathname.startsWith('/datenschutz');

		if (!isExempt) {
			// Load the access context once per request: active scope memberships
			// (non-revoked, non-retired), the guest access window, and the home
			// corner + region. One SECURITY DEFINER round trip replaces the raw
			// identity_scopes select — see migration 20260605100400. The
			// discover-feed query and the public profile query in prompt-query.ts
			// read locals.scopes/homeScope to gate scoped prompts.
			const { data: ctxRows, error: ctxError } = await event.locals.supabase.rpc(
				'get_my_access_context'
			);
			if (ctxError) {
				// Fail open, consistent with the feedback gate and the meeting
				// advancement below: a transient DB error must not lock every
				// member out. The cost is one request where an expired guest
				// passes the gate and a corner member sees commons defaults —
				// logged so repeated failures are visible in log tailing.
				console.error('[hooks] get_my_access_context failed:', ctxError.message);
			}
			const ctx = firstAccessContextRow(ctxRows);
			event.locals.scopes = ctx?.scopes ?? [];
			event.locals.homeScope = ctx?.home_scope ?? null;
			event.locals.homeRegion = ctx?.home_region ?? null;
			event.locals.accessExpiresAt = ctx?.access_expires_at ?? null;

			// Access gate: a guest whose window has ended is blocked before any
			// further work — no meeting advancement, no feedback gates. Page
			// navigations land on /access-ended (exempt above, so it stays
			// reachable); API calls get the same two-shape treatment as the
			// feedback gate. See migration 20260605100200 and plan R10/R11.
			if (
				event.locals.accessExpiresAt &&
				new Date(event.locals.accessExpiresAt).getTime() < Date.now()
			) {
				if (pathname.startsWith('/api/')) {
					return new Response(JSON.stringify({ error: 'access_ended' }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				return new Response(null, {
					status: 302,
					headers: { Location: '/access-ended' }
				});
			}

			// Advance any meetings whose scheduled_time has passed — creates feedback_forms with state='due'.
			// Pre-existing posture note: this RPC is invoked on the request-scoped
			// client; its grants govern what it may do. Left untouched here — the
			// access gate above simply ensures expired guests never trigger it.
			try { await event.locals.supabase.rpc('advance_scheduled_meetings'); } catch { /* fail open */ }

			const { SupabaseGateService } = await import('$lib/services/gate.js');
			const gateService = new SupabaseGateService(event.locals.supabase);
			const gateStatus = await gateService.checkGate(user.id);

			if (gateStatus.gated && gateStatus.kind === 'one_on_one') {
				if (pathname.startsWith('/api/')) {
					// Body mirrors the GateStatus discriminated union ({kind, formId}) so
					// programmatic callers handle both gate kinds with one shape.
					return new Response(JSON.stringify({ error: 'gated', kind: gateStatus.kind, formId: gateStatus.formId }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				// Store in locals so the layout renders the feedback modal instead of redirecting
				(event.locals as any).pendingFeedbackFormId = gateStatus.formId;
			} else if (gateStatus.gated && gateStatus.kind === 'group') {
				// Group feedback (R5/U11): one simple group-level form per gathering.
				// Routed to a dedicated /feedback/group/[id] page (which is gate-exempt
				// under the /feedback prefix). Unlike the one-on-one modal path, this
				// redirects — the group form is a standalone page with no reveal state.
				if (pathname.startsWith('/api/')) {
					return new Response(JSON.stringify({ error: 'gated', kind: gateStatus.kind, formId: gateStatus.formId }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				return new Response(null, {
					status: 302,
					headers: { Location: `/feedback/group/${gateStatus.formId}` }
				});
			}
		}
	}

	return resolve(event);
};
