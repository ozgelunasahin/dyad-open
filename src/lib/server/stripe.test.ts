import { describe, it, expect } from 'vitest';
import Stripe from 'stripe';
import { createStripeClient, cryptoProvider } from './stripe';

/**
 * These assertions are the pinned-version contract: they fail if a future
 * `stripe` bump removes or renames the Worker-compatible primitives dyad
 * depends on (fetch HTTP client + SubtleCrypto signature verification).
 */
describe('createStripeClient', () => {
	it('wires the Worker-compatible fetch HTTP client', () => {
		const client = createStripeClient('sk_test_dummy');
		expect(client).toBeInstanceOf(Stripe);
		// The Node https client fails on Cloudflare Workers; the fetch client is
		// what makes outbound Stripe API calls work there.
		expect(client.getApiField('httpClient').constructor.name).toBe('FetchHttpClient');
	});

	it('exposes a SubtleCrypto provider for webhook signature verification', () => {
		// constructEventAsync(..., cryptoProvider) needs SubtleCrypto on Workers;
		// the synchronous constructEvent path uses node:crypto and cannot run there.
		expect(cryptoProvider.constructor.name).toBe('SubtleCryptoProvider');
	});

	it('throws a descriptive error before any network call when the key is missing', () => {
		expect(() => createStripeClient(undefined)).toThrow(/STRIPE_SECRET_KEY/);
		expect(() => createStripeClient('')).toThrow(/STRIPE_SECRET_KEY/);
	});
});
