import { describe, it, expect, vi } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

vi.mock('$env/static/public', () => ({ PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' }));

const { PUBLIC_PATHS, NON_PUBLIC_PREFIXES, CANONICAL_OVERRIDES, isPublicPath } =
	await import('./seo.js');

/**
 * `isPublicPath` is fail-open: anything not matching a gated prefix is treated
 * as public, so a new authenticated route added without a `NON_PUBLIC_PREFIXES`
 * entry silently becomes crawlable and self-canonical. Nothing else in the app
 * would notice — the auth guard still blocks the content, so the only symptom
 * is a login page indexed under a dozen URLs months later.
 *
 * `robots.test.ts` and `sitemap.xml/server.test.ts` pin the hand-kept lists to
 * each other. This one pins them to the actual route tree, which is the part
 * that can drift without anyone editing a list.
 */

const ROUTES_DIR = fileURLToPath(new URL('../routes', import.meta.url));

/** SvelteKit group directories `(app)` are routing-only and contribute no URL segment. */
const isGroup = (name: string) => name.startsWith('(') && name.endsWith(')');

/**
 * Top-level URL segments that actually exist, walking through group directories.
 * Dynamic segments (`[slug]`) are skipped — they are covered by their parent.
 */
function topLevelSegments(dir: string, acc = new Set<string>()): Set<string> {
	for (const name of readdirSync(dir, { withFileTypes: true })) {
		if (!name.isDirectory()) continue;
		if (isGroup(name.name)) {
			topLevelSegments(`${dir}/${name.name}`, acc);
			continue;
		}
		if (name.name.startsWith('[') || name.name.startsWith('.')) continue;
		acc.add('/' + name.name);
	}
	return acc;
}

/**
 * Routes with no rendered page and no crawlable URL a human would visit.
 * Each needs a reason, so the list cannot quietly absorb a real page.
 */
const NOT_A_PAGE: Record<string, string> = {
	'/sitemap.xml': 'the sitemap itself; listing itself would be circular',
	'/waitlist': 'redirect only (308 to /signup); crawlers should follow it, not index it'
};

describe('route-tree classification', () => {
	const segments = [...topLevelSegments(ROUTES_DIR)].sort();

	it('finds the route tree (guards against the walker silently returning nothing)', () => {
		expect(segments.length).toBeGreaterThan(5);
		expect(segments).toContain('/wiggling');
		expect(segments).toContain('/discover');
	});

	it.each(
		[...topLevelSegments(ROUTES_DIR)].sort().map((s) => ({ segment: s }))
	)('$segment is classified as public or gated', ({ segment }) => {
		if (segment in NOT_A_PAGE) return;

		const gated = NON_PUBLIC_PREFIXES.some((p) => segment === p || segment.startsWith(p + '/'));
		const declaredPublic = (PUBLIC_PATHS as readonly string[]).includes(segment);
		const canonicalisedElsewhere = segment in CANONICAL_OVERRIDES;

		expect(
			gated || declaredPublic || canonicalisedElsewhere,
			`${segment} exists under src/routes but is classified nowhere in ` +
				`src/lib/seo.ts. Pick one: PUBLIC_PATHS if it should be indexed at its ` +
				`own URL, NON_PUBLIC_PREFIXES (and static/robots.txt) if it should not ` +
				`be crawled, or CANONICAL_OVERRIDES if it is reachable but duplicates ` +
				`a page that owns the content.`
		).toBe(true);
	});

	it('agrees with isPublicPath for every declared gated prefix', () => {
		for (const prefix of NON_PUBLIC_PREFIXES) {
			expect(isPublicPath(prefix), `${prefix} should not be public`).toBe(false);
		}
	});

	it('lists no path in PUBLIC_PATHS that a gated prefix would shadow', () => {
		for (const path of PUBLIC_PATHS) {
			expect(isPublicPath(path), `${path} is in PUBLIC_PATHS but reads as gated`).toBe(true);
		}
	});

	it('keeps canonical overrides out of the sitemap', () => {
		// Being absent from PUBLIC_PATHS is the half of the statement that stops
		// the sitemap advertising a URL whose own canonical points elsewhere.
		for (const from of Object.keys(CANONICAL_OVERRIDES)) {
			expect(
				(PUBLIC_PATHS as readonly string[]).includes(from),
				`${from} declares another URL canonical, so it should not be in PUBLIC_PATHS`
			).toBe(false);
		}
	});

	it('points every override at a path that is itself indexed', () => {
		// An override aiming at a page that is gated, missing, or itself
		// overridden would send crawlers to a dead end.
		for (const [from, to] of Object.entries(CANONICAL_OVERRIDES)) {
			expect(
				(PUBLIC_PATHS as readonly string[]).includes(to),
				`${from} canonicalises to ${to}, which is not in PUBLIC_PATHS`
			).toBe(true);
			expect(to in CANONICAL_OVERRIDES, `${to} is both a target and an override`).toBe(false);
		}
	});
});
