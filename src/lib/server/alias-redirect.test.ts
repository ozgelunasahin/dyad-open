import { describe, it, expect } from 'vitest';
import {
	aliasRedirect,
	ALIAS_REDIRECT_STATUS,
	WEBHOOK_EXEMPT_FROM_REDIRECT
} from './alias-redirect.js';

describe('aliasRedirect', () => {
	it('redirects permanently so ranking transfers to the canonical host', () => {
		const res = aliasRedirect(new URL('https://dyad.berlin/wiggling'), 'dyad.social');
		expect(res?.status).toBe(301);
	});

	it('preserves the path', () => {
		const res = aliasRedirect(new URL('https://dyad.berlin/newsletter/some-entry'), 'dyad.social');
		expect(res?.headers.get('Location')).toBe('https://dyad.social/newsletter/some-entry');
	});

	it('preserves the query string', () => {
		const res = aliasRedirect(new URL('https://dyad.berlin/join?glink=abc123'), 'dyad.social');
		expect(res?.headers.get('Location')).toBe('https://dyad.social/join?glink=abc123');
	});

	it('redirects the bare root without doubling the slash', () => {
		const res = aliasRedirect(new URL('https://dyad.berlin/'), 'dyad.social');
		expect(res?.headers.get('Location')).toBe('https://dyad.social/');
	});

	it('redirects to the target the caller resolved rather than a hardcoded apex', () => {
		// www.dyad.berlin is an actual ALIAS_TARGETS key. Hosts outside that map
		// never reach this helper — they classify as 'reject' and 404.
		const res = aliasRedirect(new URL('https://www.dyad.berlin/join'), 'dyad.social');
		expect(res?.headers.get('Location')).toBe('https://dyad.social/join');
	});

	describe('machine traffic is served in place, not redirected', () => {
		it('does not redirect a POST, whose body a redirect would discard', () => {
			// 301 and 302 both downgrade POST to GET and drop the body, so
			// redirecting is strictly worse than serving.
			expect(aliasRedirect(new URL('https://dyad.berlin/anything'), 'dyad.social', 'POST')).toBeNull();
		});

		it('does not redirect any /api/ path, whatever the method', () => {
			// /api/webhooks/resend-sync is configured at an alias host in its own
			// README and had no exemption when the list was path-by-path.
			for (const p of ['/api/webhooks/resend-sync', '/api/stripe/webhook', '/api/feedback']) {
				expect(aliasRedirect(new URL(`https://dyad.berlin${p}`), 'dyad.social', 'GET')).toBeNull();
			}
		});

		it('still redirects an ordinary browser GET', () => {
			expect(aliasRedirect(new URL('https://dyad.berlin/wiggling'), 'dyad.social', 'GET')?.status)
				.toBe(301);
		});

		it('redirects HEAD, which link checkers and crawlers use', () => {
			expect(aliasRedirect(new URL('https://dyad.berlin/zine'), 'dyad.social', 'HEAD')?.status)
				.toBe(301);
		});
	});

	describe('Stripe webhook exemption (payment incident 2026-07-27)', () => {
		it('does not redirect the webhook path', () => {
			// Stripe does not follow redirects. Any redirect here is a failed
			// delivery and no membership activates.
			const res = aliasRedirect(
				new URL(`https://dyad.berlin${WEBHOOK_EXEMPT_FROM_REDIRECT}`),
				'dyad.social'
			);
			expect(res).toBeNull();
		});

		it('still exempts the webhook when it carries a query string', () => {
			const res = aliasRedirect(
				new URL(`https://dyad.berlin${WEBHOOK_EXEMPT_FROM_REDIRECT}?x=1`),
				'dyad.social'
			);
			expect(res).toBeNull();
		});

		it('exempts paths below the webhook too, since the whole API surface is exempt', () => {
			// The exemption covers the API surface, not a list of known webhooks:
			// /api/webhooks/resend-sync is configured at an alias host in its own
			// README and would be missed by an exact-path check.
			const res = aliasRedirect(
				new URL(`https://dyad.berlin${WEBHOOK_EXEMPT_FROM_REDIRECT}/extra`),
				'dyad.social'
			);
			expect(res).toBeNull();
		});

		it('still redirects a browser path that merely resembles an API path', () => {
			// '/apirary' shares a prefix with '/api' but is not under it; the
			// exemption must not swallow ordinary pages.
			const res = aliasRedirect(new URL('https://dyad.berlin/apirary'), 'dyad.social');
			expect(res?.status).toBe(ALIAS_REDIRECT_STATUS);
		});
	});
});
