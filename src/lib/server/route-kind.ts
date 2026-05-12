/**
 * Classifies an inbound request URL by hostname and path. `'reject'` is the
 * load-bearing protection against admin admission on non-canonical hostnames
 * — see SECURITY.md and `tests/security-poc/admin-bypass-hostname.test.ts`.
 */
export type RouteKind = 'admin' | 'apex-redirect' | 'user' | 'reject';

export interface RouteKindOptions {
	devMode: boolean;
	apexHostname: string;
	adminHostname: string;
	/**
	 * Project's canonical Pages hostname (e.g. `dyad-berlin.pages.dev`).
	 * Matches root and `*.<previewHostname>` for non-admin paths. Scoped to
	 * the project so other-account Pages projects can't slip in. Empty
	 * string disables preview admission entirely.
	 */
	previewHostname: string;
}

export function routeKind(url: URL, opts: RouteKindOptions): RouteKind {
	// Strip trailing FQDN dot; Node URL preserves it.
	const hostname = url.hostname.replace(/\.$/, '');
	const isAdminPath = url.pathname.startsWith('/admin');

	if (hostname === opts.apexHostname) {
		return isAdminPath ? 'apex-redirect' : 'user';
	}

	if (hostname === opts.adminHostname) {
		return 'admin';
	}

	if (opts.devMode && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]')) {
		return isAdminPath ? 'admin' : 'user';
	}

	if (opts.previewHostname.length > 0 && isPreviewHost(hostname, opts.previewHostname)) {
		return isAdminPath ? 'reject' : 'user';
	}

	return 'reject';
}

function isPreviewHost(hostname: string, previewHostname: string): boolean {
	return hostname === previewHostname || hostname.endsWith('.' + previewHostname);
}
