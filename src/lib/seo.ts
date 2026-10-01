import { PUBLIC_SUPABASE_URL } from '$env/static/public';

/**
 * Canonical origin for the public site.
 *
 * Deliberately duplicates the derivation in `$lib/server/app-origin`, which
 * cannot be imported here: SvelteKit forbids `$lib/server/*` in code that
 * reaches the client, and the canonical tag is emitted from the root layout.
 * `seo.test.ts` asserts the two stay equal, so the duplication cannot drift
 * silently.
 */
const IS_LOCAL =
	PUBLIC_SUPABASE_URL?.includes('localhost') || PUBLIC_SUPABASE_URL?.includes('127.0.0.1');

export const SITE_ORIGIN = IS_LOCAL ? 'http://localhost:5173' : 'https://dyad.social';

/**
 * Path prefixes that must never be indexed: the authenticated app, the admin
 * plane, the editor, auth flows, and the API. Mirrored by the Disallow list in
 * `static/robots.txt` — `robots.test.ts` asserts the two agree.
 */
export const NON_PUBLIC_PREFIXES = [
	'/admin',
	'/api',
	'/auth',
	'/oauth',
	'/prompts',
	'/discover',
	'/conversations',
	'/meetings',
	'/feedback',
	'/profile',
	'/membership',
	'/users',
	'/login',
	'/signup',
	'/join',
	'/welcome',
	'/access-ended',
	'/logout',
	'/dev'
] as const;

/**
 * Public paths with stable URLs. `/newsletter/[slug]` entries are enumerated
 * from the content module at request time rather than listed here.
 */
export const PUBLIC_PATHS = [
	'/',
	'/about',
	'/zine',
	'/wiggling',
	'/newsletter',
	'/community-care',
	'/docs',
	'/waitlist',
	'/impressum',
	'/datenschutz',
	'/agb'
] as const;

/**
 * Public pages that are not their own canonical, mapped to the URL that is.
 *
 * These stay reachable and return 200; they are simply not the address search
 * engines should index or rank. Being absent from `PUBLIC_PATHS` keeps them out
 * of the sitemap, which is the matching half of the same statement.
 */
export const CANONICAL_OVERRIDES: Record<string, string> = {
	// /legal renders one document at a time and defaults to the Impressum, so a
	// crawler receives exactly the body /impressum serves. The standalone page
	// wins because German law expects the Impressum at a directly reachable URL,
	// and because the reverse is impossible: /legal cannot be the canonical for
	// three documents when it only ever shows one.
	'/legal': '/impressum'
};

/**
 * Fail-open by design, and worth knowing: a path is public unless it matches a
 * gated prefix. Adding a gated route without adding its prefix here leaves it
 * crawlable and self-canonical, and nothing else in the app will notice.
 * `seo-routes.test.ts` walks the real route tree and fails when a route is
 * classified by neither list, which is what keeps the default honest.
 */
export function isPublicPath(pathname: string): boolean {
	return !NON_PUBLIC_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
	);
}

/**
 * Absolute canonical URL for a path, always on the canonical origin.
 *
 * Built from the origin rather than the request host on purpose: dyad.amsterdam
 * and the Cloudflare preview subdomains serve the same public pages, and a
 * host-derived canonical would declare each duplicate authoritative instead of
 * consolidating them.
 */
export function canonicalUrl(pathname: string): string {
	const [rawPath] = pathname.split(/[?#]/);
	const trimmed = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;
	const path = CANONICAL_OVERRIDES[trimmed] ?? trimmed;
	return SITE_ORIGIN + (path.startsWith('/') ? path : '/' + path);
}

export interface ArticleMeta {
	title: string;
	description: string;
	path: string;
	datePublished?: string;
	/** Absolute URL. Google requires an image for Article rich-result eligibility. */
	image?: string;
}

/**
 * JSON-LD `Article` for a published essay, ready to embed in a script tag.
 *
 * Every `<` is escaped to `<`, not just `</`. Inside a script element the
 * tokenizer also reacts to `<!--` and `<script`, so escaping only the closing
 * sequence leaves the double-escape breakout open. Escaping the character
 * outright is safe by construction rather than safe because today's content
 * happens to be developer-authored, and it round-trips identically through
 * `JSON.parse`. This is a script-context hazard rather than an HTML-text one,
 * so `$lib/utils/escape-html` is deliberately not used.
 */
export function articleJsonLd(meta: ArticleMeta): string {
	const data: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: meta.title,
		description: meta.description,
		url: canonicalUrl(meta.path),
		publisher: {
			'@type': 'Organization',
			name: 'dyad',
			url: SITE_ORIGIN
		}
	};
	if (meta.datePublished) data.datePublished = meta.datePublished;
	// Without an image the markup is well-formed but ineligible for the Article
	// rich result, which is the only reason to emit it.
	if (meta.image) data.image = meta.image;

	return JSON.stringify(data).replace(/</g, '\\u003c');
}
