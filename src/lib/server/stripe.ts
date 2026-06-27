import Stripe from 'stripe';

/**
 * Worker-compatible Stripe client.
 *
 * dyad runs on Cloudflare Pages/Workers, which has no Node `https`/`crypto`
 * stack. Stripe's default client reaches for both and fails at runtime there.
 * We construct with the fetch-based HTTP client and verify webhook signatures
 * with the SubtleCrypto provider (`constructEventAsync`, never the sync
 * `constructEvent`) so both API calls and signature checks work on Workers.
 *
 * Secrets are read via `$env/dynamic/private` at the call site (never
 * `$env/static/private` — static inlines at build time and breaks the
 * Cloudflare build when the key is absent). Construct lazily inside request
 * handlers, never at module top level.
 *
 * Privacy contract: dyad sends Stripe only an opaque per-actor `payment_ref`
 * (see the `memberships` table), never the actor id or any PII.
 *
 * The Stripe version is pinned in package.json (no caret): a payments SDK's
 * webhook-signature and API behaviour must not drift on an unattended minor
 * bump. This module's test asserts the Worker-compatible primitives exist on
 * whatever version is pinned — that assertion IS the version contract.
 */

/**
 * SubtleCrypto-based signature provider, passed to `constructEventAsync` by the
 * webhook handler. Created once at module load; it holds no per-request state.
 */
export const cryptoProvider = Stripe.createSubtleCryptoProvider();

/**
 * Build a Worker-compatible Stripe client from the secret key.
 *
 * Throws synchronously — before any network call — when the key is absent, so a
 * misconfigured deploy fails loudly at the first request rather than issuing an
 * unauthenticated Stripe call.
 */
export function createStripeClient(secretKey: string | undefined): Stripe {
	if (!secretKey) {
		throw new Error('Stripe is not configured: STRIPE_SECRET_KEY is missing');
	}
	return new Stripe(secretKey, {
		httpClient: Stripe.createFetchHttpClient()
	});
}
