import { describe, it, expect } from 'vitest';
import { routeKind } from './route-kind.js';

const PROD_OPTS = {
	devMode: false,
	apexHostname: 'dyad.berlin',
	adminHostname: 'admin.dyad.berlin',
	previewHostname: 'dyad-berlin.pages.dev'
} as const;

const DEV_OPTS = {
	devMode: true,
	apexHostname: 'dyad.berlin',
	adminHostname: 'admin.dyad.berlin',
	previewHostname: 'dyad-berlin.pages.dev'
} as const;

describe('routeKind — canonical hostnames', () => {
	it('apex hostname + non-admin path → user', () => {
		expect(routeKind(new URL('https://dyad.berlin/discover'), PROD_OPTS)).toBe('user');
	});

	it('apex hostname + /admin/* path → apex-redirect', () => {
		expect(routeKind(new URL('https://dyad.berlin/admin/members'), PROD_OPTS)).toBe('apex-redirect');
	});

	it('apex hostname + root → user', () => {
		expect(routeKind(new URL('https://dyad.berlin/'), PROD_OPTS)).toBe('user');
	});

	it('admin hostname + any path → admin (admin host only serves admin)', () => {
		expect(routeKind(new URL('https://admin.dyad.berlin/members'), PROD_OPTS)).toBe('admin');
		expect(routeKind(new URL('https://admin.dyad.berlin/'), PROD_OPTS)).toBe('admin');
	});
});

describe('routeKind — Pages preview admission (D1)', () => {
	it('preview hostname + non-admin path → user (allow preview workflow)', () => {
		expect(routeKind(new URL('https://feature-x.dyad-berlin.pages.dev/discover'), PROD_OPTS)).toBe('user');
	});

	it('preview hostname + /admin/* → reject (admin never served on preview)', () => {
		expect(routeKind(new URL('https://feature-x.dyad-berlin.pages.dev/admin/members'), PROD_OPTS)).toBe('reject');
	});

	it('canonical project preview (no branch prefix) + non-admin → user', () => {
		expect(routeKind(new URL('https://dyad-berlin.pages.dev/discover'), PROD_OPTS)).toBe('user');
	});

	it('canonical project preview + /admin/* → reject', () => {
		expect(routeKind(new URL('https://dyad-berlin.pages.dev/admin/members'), PROD_OPTS)).toBe('reject');
	});

	it('empty previewHostname disables preview admission entirely', () => {
		const opts = { ...PROD_OPTS, previewHostname: '' };
		expect(routeKind(new URL('https://feature-x.dyad-berlin.pages.dev/discover'), opts)).toBe('reject');
	});
});

describe('routeKind — secondary apex + alias hosts (conference domain)', () => {
	const AMS_OPTS = {
		...PROD_OPTS,
		secondaryApexHostnames: ['dyad.amsterdam'],
		aliasHostnames: ['www.dyad.amsterdam']
	} as const;

	it('secondary apex + non-admin path → user (the app is served)', () => {
		expect(routeKind(new URL('https://dyad.amsterdam/'), AMS_OPTS)).toBe('user');
		expect(routeKind(new URL('https://dyad.amsterdam/discover'), AMS_OPTS)).toBe('user');
		expect(routeKind(new URL('https://dyad.amsterdam/join?glink=x'), AMS_OPTS)).toBe('user');
	});

	it('secondary apex + /admin/* → apex-redirect (admin never served off-canonical)', () => {
		expect(routeKind(new URL('https://dyad.amsterdam/admin/members'), AMS_OPTS)).toBe('apex-redirect');
	});

	it('alias host → alias-redirect on every path, including /admin', () => {
		expect(routeKind(new URL('https://www.dyad.amsterdam/'), AMS_OPTS)).toBe('alias-redirect');
		expect(routeKind(new URL('https://www.dyad.amsterdam/join?glink=x'), AMS_OPTS)).toBe('alias-redirect');
		expect(routeKind(new URL('https://www.dyad.amsterdam/admin/members'), AMS_OPTS)).toBe('alias-redirect');
	});

	it('without the options, the conference hosts stay rejected (back-compat)', () => {
		expect(routeKind(new URL('https://dyad.amsterdam/'), PROD_OPTS)).toBe('reject');
		expect(routeKind(new URL('https://www.dyad.amsterdam/'), PROD_OPTS)).toBe('reject');
	});

	it('trailing FQDN dot is stripped on secondary apex too', () => {
		expect(routeKind(new URL('https://dyad.amsterdam./discover'), AMS_OPTS)).toBe('user');
	});
});

describe('routeKind — non-canonical hostnames are rejected', () => {
	it('attacker-controlled hostname + non-admin path → reject', () => {
		expect(routeKind(new URL('https://attacker.example.com/discover'), PROD_OPTS)).toBe('reject');
	});

	it('attacker-controlled hostname + /admin/* → reject (the load-bearing protection)', () => {
		expect(routeKind(new URL('https://attacker.example.com/admin/members'), PROD_OPTS)).toBe('reject');
	});

	it('other-account Pages project → reject (project-scoped allowlist)', () => {
		expect(routeKind(new URL('https://attacker.pages.dev/admin/members'), PROD_OPTS)).toBe('reject');
		expect(routeKind(new URL('https://attacker.pages.dev/discover'), PROD_OPTS)).toBe('reject');
		expect(routeKind(new URL('https://malicious.different-project.pages.dev/admin/members'), PROD_OPTS)).toBe('reject');
		expect(routeKind(new URL('https://malicious.different-project.pages.dev/discover'), PROD_OPTS)).toBe('reject');
	});

	it('legacy custom domain pointing at same project → reject', () => {
		expect(routeKind(new URL('https://old.dyad.berlin/admin/members'), PROD_OPTS)).toBe('reject');
	});
});

describe('routeKind — dev mode allowances', () => {
	it('localhost + /admin/* in dev → admin', () => {
		expect(routeKind(new URL('http://localhost:5173/admin/members'), DEV_OPTS)).toBe('admin');
	});

	it('localhost + non-admin in dev → user', () => {
		expect(routeKind(new URL('http://localhost:5173/discover'), DEV_OPTS)).toBe('user');
	});

	it('127.0.0.1 in dev → admin or user by path', () => {
		expect(routeKind(new URL('http://127.0.0.1:5173/admin/members'), DEV_OPTS)).toBe('admin');
		expect(routeKind(new URL('http://127.0.0.1:5173/discover'), DEV_OPTS)).toBe('user');
	});

	it('IPv6 loopback [::1] in dev → admin or user by path', () => {
		expect(routeKind(new URL('http://[::1]:5173/admin/members'), DEV_OPTS)).toBe('admin');
		expect(routeKind(new URL('http://[::1]:5173/discover'), DEV_OPTS)).toBe('user');
	});

	it('localhost + /admin/* in PROD → reject (dev allowance gated off)', () => {
		expect(routeKind(new URL('http://localhost/admin/members'), PROD_OPTS)).toBe('reject');
	});
});

describe('routeKind — hostname normalization and boundary safety', () => {
	it('trailing FQDN dot on canonical admin hostname normalises and admits', () => {
		expect(routeKind(new URL('https://admin.dyad.berlin./members'), PROD_OPTS)).toBe('admin');
	});

	it('trailing FQDN dot on canonical apex hostname normalises and admits', () => {
		expect(routeKind(new URL('https://dyad.berlin./discover'), PROD_OPTS)).toBe('user');
		expect(routeKind(new URL('https://dyad.berlin./admin/members'), PROD_OPTS)).toBe('apex-redirect');
	});

	it('trailing FQDN dot on preview hostname normalises and admits non-admin', () => {
		expect(routeKind(new URL('https://feature-x.dyad-berlin.pages.dev./discover'), PROD_OPTS)).toBe('user');
	});

	it('suffix-confusion: label-boundary match — `evil-dyad-berlin.pages.dev` must not match', () => {
		expect(routeKind(new URL('https://evil-dyad-berlin.pages.dev/discover'), PROD_OPTS)).toBe('reject');
		expect(routeKind(new URL('https://evil-dyad-berlin.pages.dev/admin/members'), PROD_OPTS)).toBe('reject');
		expect(routeKind(new URL('https://dyad-berlin-evil.pages.dev/discover'), PROD_OPTS)).toBe('reject');
	});
});
