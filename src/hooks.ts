import type { Reroute } from '@sveltejs/kit';

const ADMIN_HOSTNAME = 'admin.dyad.berlin';

/**
 * Universal reroute: when the request comes in on the admin subdomain,
 * route it as if the path were prefixed with /admin. The user-facing URL
 * stays clean (admin.dyad.berlin/waitlist) but the SvelteKit route file
 * at src/routes/(admin)/admin/waitlist/+page.svelte is what handles it.
 *
 * Local dev keeps using path-based admin URLs (localhost:5173/admin/waitlist) —
 * no subdomain rewriting needed there.
 *
 * Authorization is enforced separately in src/hooks.server.ts based on
 * hostname (admin subdomain OR /admin/* path).
 */
export const reroute: Reroute = ({ url }) => {
	if (url.hostname === ADMIN_HOSTNAME && !url.pathname.startsWith('/admin')) {
		return '/admin' + url.pathname;
	}
};
