/**
 * Server-side PostHog capture via HTTP API.
 * Used for events that fire from Cloudflare Worker handlers (no browser context).
 *
 * NOTE: On Cloudflare Workers, fire-and-forget fetch() calls are killed when the
 * response returns. This helper uses await to ensure delivery. Theodore's client-side
 * spec uses .catch(() => {}) fire-and-forget — that pattern is used directly in API
 * route handlers per his spec. This helper is for the invite email flow only.
 */
import { env } from '$env/dynamic/public';

// Disabled — re-enable after privacy/reliability fixes land (#101)
export async function captureServer(
	_distinctId: string,
	_event: string,
	_properties?: Record<string, unknown>
): Promise<void> {
	return;
}
