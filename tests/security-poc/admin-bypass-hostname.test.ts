/**
 * Regression test for the non-canonical-hostname admin bypass (Finding 1).
 * See `tests/security-poc/README.md` for context. Runs via the standalone
 * vitest config in this directory.
 */

import { describe, it, expect } from 'vitest';
import { routeKind } from '../../src/lib/server/route-kind.js';
import { resolveAdminOperator } from '../../src/lib/server/admin-auth.js';

const PROD_OPTS = {
	devMode: false,
	apexHostname: 'dyad.berlin',
	adminHostname: 'admin.dyad.berlin',
	previewHostname: 'dyad-berlin.pages.dev'
} as const;

function makeRequest(url: string, headers: Record<string, string> = {}): Request {
	const h = new Headers();
	for (const [k, v] of Object.entries(headers)) h.set(k, v);
	return new Request(url, { headers: h });
}

describe('PoC #1 — non-canonical hostname admin bypass (regression test)', () => {
	const SPOOFED_EMAIL = 'attacker@example.com';

	const NON_CANONICAL_ADMIN_URLS = [
		'https://staging.dyad.example/admin/members',
		'https://attacker.example.com/admin/members',
		'https://attacker.pages.dev/admin/members',
		'https://malicious.different-project.pages.dev/admin/members',
		'https://old.dyad.berlin/admin/members'
	];

	it.each(NON_CANONICAL_ADMIN_URLS)(
		'routeKind rejects admin path on non-canonical hostname: %s',
		(href) => {
			expect(routeKind(new URL(href), PROD_OPTS)).toBe('reject');
		}
	);

	it('routeKind rejects admin path on a Pages preview URL (admin never served on preview)', () => {
		expect(
			routeKind(new URL('https://feature-x.dyad-berlin.pages.dev/admin/members'), PROD_OPTS)
		).toBe('reject');
	});

	it('routeKind admits non-admin path on a Pages preview URL (preview workflow preserved)', () => {
		expect(
			routeKind(new URL('https://feature-x.dyad-berlin.pages.dev/discover'), PROD_OPTS)
		).toBe('user');
	});

	// Defence-in-depth canary: admin-auth still admits a spoofed header when
	// called without the routing layer. If this flips, the routing-layer
	// gate is the only thing standing between an attacker and admission.
	it.each(NON_CANONICAL_ADMIN_URLS)(
		'admin-auth admits spoofed header in isolation (canary; protected by routing layer): %s',
		async (href) => {
			const request = makeRequest(href, {
				'cf-access-authenticated-user-email': SPOOFED_EMAIL
			});
			const operator = await resolveAdminOperator(request, {
				devMode: false,
				bypassEnabled: false
			});
			expect(operator).toEqual({ email: SPOOFED_EMAIL });
		}
	);
});

describe('PoC #1 — canonical-path control cases', () => {
	it('canonical admin hostname classifies as admin', () => {
		expect(routeKind(new URL('https://admin.dyad.berlin/members'), PROD_OPTS)).toBe('admin');
	});

	it('canonical apex hostname + /admin/* classifies as apex-redirect', () => {
		expect(routeKind(new URL('https://dyad.berlin/admin/members'), PROD_OPTS)).toBe('apex-redirect');
	});

	it('canonical apex hostname + non-admin path classifies as user', () => {
		expect(routeKind(new URL('https://dyad.berlin/discover'), PROD_OPTS)).toBe('user');
	});
});
