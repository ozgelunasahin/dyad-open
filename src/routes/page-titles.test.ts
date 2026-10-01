import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

vi.mock('$env/static/public', () => ({ PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' }));

const { copy } = await import('$lib/copy');

/**
 * Public routes and the file that owns their <title>. Titles live in the route
 * files rather than a shared component, so this map is the only way to check
 * them together. A new public page belongs here — the sitemap lists it, and an
 * untitled or off-brand page in search results is the failure this catches.
 *
 * Titles are literals in most of these files by design: importing the suffix
 * constant into every page would be churn for no behavioural gain. The
 * assertions below are what actually holds them to one value.
 */
const ROUTES: Array<{ path: string; file: string; homepage?: boolean }> = [
	{ path: '/', file: 'src/routes/+page.svelte', homepage: true },
	{ path: '/about', file: 'src/routes/about/+page.svelte' },
	{ path: '/zine', file: 'src/routes/zine/+page.svelte' },
	{ path: '/wiggling', file: 'src/routes/(zine)/wiggling/+page.svelte' },
	{ path: '/newsletter', file: 'src/routes/(zine)/newsletter/+page.svelte' },
	{ path: '/newsletter/[slug]', file: 'src/routes/(zine)/newsletter/[slug]/+page.svelte' },
	{ path: '/community-care', file: 'src/routes/(zine)/community-care/+page.svelte' },
	{ path: '/docs', file: 'src/routes/(zine)/docs/+page.svelte' },
	{ path: '/impressum', file: 'src/routes/impressum/+page.svelte' },
	{ path: '/datenschutz', file: 'src/routes/datenschutz/+page.svelte' },
	{ path: '/agb', file: 'src/routes/agb/+page.svelte' },
	{ path: '/legal', file: 'src/routes/legal/+page.svelte' },
	{ path: '/waitlist', file: 'src/routes/(auth)/waitlist/+page.svelte' }
];

const read = (file: string) =>
	readFileSync(fileURLToPath(new URL('../../' + file, import.meta.url)), 'utf-8');

const SUFFIX = copy.common.titleSuffix;

/**
 * Reads the title from source and resolves the one template expression that
 * matters, so a page may write the suffix either as a literal or through the
 * constant and still be checked against the same value.
 */
/** Resolves `{copy.a.b}` against the real copy object so a title sourced from
 *  copy.ts is checked the same way as a literal one. */
const resolveCopyRefs = (s: string) =>
	s.replace(/\{copy\.([\w.]+)\}/g, (whole, path: string) => {
		const value = path
			.split('.')
			.reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], copy);
		return typeof value === 'string' ? value : whole;
	});

const titleOf = (src: string) =>
	resolveCopyRefs(src.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').trim() || undefined;

describe('ROUTES stays in step with the sitemap', () => {
	it('covers every non-dynamic path the sitemap advertises', async () => {
		// Two hand-kept lists of the same page set. Without this, a page added to
		// PUBLIC_PATHS is sitemapped and crawled while silently dropping out of the
		// title and description checks below.
		const { PUBLIC_PATHS } = await import('$lib/seo');
		const covered = new Set(ROUTES.map((r) => r.path));
		for (const path of PUBLIC_PATHS) {
			expect(covered.has(path), `${path} is in PUBLIC_PATHS but missing from ROUTES`).toBe(true);
		}
	});
});

describe('public page titles', () => {
	it.each(ROUTES)('$path declares a title', ({ file }) => {
		expect(titleOf(read(file))).toBeTruthy();
	});

	it.each(ROUTES.filter((r) => !r.homepage))(
		'$path ends with the single brand suffix',
		({ file }) => {
			// Catches a page reintroducing 'dyad.social' or the long
			// 'dyad. cultivating a culture of conversation' variant.
			expect(titleOf(read(file))?.endsWith(SUFFIX)).toBe(true);
		}
	);

	it.each(ROUTES.filter((r) => !r.homepage))(
		'$path has page-specific text before the suffix',
		({ file }) => {
			// The homepage is exempt: there, the brand IS the title.
			const title = titleOf(read(file)) ?? '';
			expect(title.slice(0, title.length - SUFFIX.length).trim().length).toBeGreaterThan(0);
		}
	);

	it('the waitlist title in copy.ts uses the same suffix', () => {
		// /waitlist renders its title from copy rather than a literal, so it is
		// invisible to the file scan above.
		expect(copy.waitlist.pageTitle.endsWith(SUFFIX)).toBe(true);
	});
});

describe('public page descriptions', () => {
	it.each(ROUTES)('$path declares a meta description', ({ file }) => {
		expect(read(file)).toMatch(/<meta\s+name="description"\s+content=/);
	});

	it('no two pages share a description', () => {
		const descriptions = ROUTES.map(({ file }) => {
			const m = read(file).match(/<meta\s+name="description"\s+content="([^"]*)"/);
			return m?.[1];
		}).filter((d): d is string => !!d && !d.includes('{'));
		expect(new Set(descriptions).size).toBe(descriptions.length);
	});
});
