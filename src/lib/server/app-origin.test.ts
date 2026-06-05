import { describe, it, expect, vi } from 'vitest';

// Hoisted mock: pin a production Supabase URL so IS_LOCAL is false and the
// region→host routing is exercised. (The local-dev fallback — every region
// collapses to the dev origin — is covered by the links-api handler test,
// which runs under a localhost env mock.)
vi.mock('$env/static/public', () => ({ PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' }));

const { joinOrigin, APP_ORIGIN } = await import('./app-origin.js');

describe('joinOrigin (production)', () => {
	it('derives the default app origin from a production Supabase URL', () => {
		expect(APP_ORIGIN).toBe('https://dyad.berlin');
	});

	it('routes an amsterdam corner to its own host', () => {
		expect(joinOrigin('amsterdam')).toBe('https://dyad.amsterdam');
	});

	it('falls back to the default origin for berlin / null / unknown regions', () => {
		expect(joinOrigin('berlin')).toBe('https://dyad.berlin');
		expect(joinOrigin(null)).toBe('https://dyad.berlin');
		expect(joinOrigin(undefined)).toBe('https://dyad.berlin');
		expect(joinOrigin('atlantis')).toBe('https://dyad.berlin');
	});
});
