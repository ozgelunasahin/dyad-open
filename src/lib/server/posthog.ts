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

export async function captureServer(
	distinctId: string,
	event: string,
	properties?: Record<string, unknown>
): Promise<void> {
	if (!env.PUBLIC_POSTHOG_KEY) return;
	await fetch('https://eu.i.posthog.com/capture/', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			api_key: env.PUBLIC_POSTHOG_KEY,
			event,
			distinct_id: distinctId,
			properties: properties ?? {}
		})
	}).catch((err) => console.error('[posthog] Server capture failed:', err));
}
