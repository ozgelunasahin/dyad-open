/**
 * PostHog analytics wrapper.
 *
 * All PostHog calls go through here so components don't import posthog-js directly.
 * The SDK is lazy-loaded — no bundle cost when PUBLIC_POSTHOG_KEY isn't set.
 */
import { browser } from '$app/environment';

let posthogInstance: typeof import('posthog-js').default | null = null;

async function getPosthog() {
	if (!browser) return null;
	if (!posthogInstance) {
		posthogInstance = (await import('posthog-js')).default;
	}
	return posthogInstance;
}

export async function initPosthog(apiKey: string, userId?: string, username?: string) {
	const posthog = await getPosthog();
	if (!posthog) return;

	posthog.init(apiKey, {
		api_host: 'https://eu.i.posthog.com',
		person_profiles: 'identified_only',
		capture_pageview: true,
		capture_pageleave: true,
		disable_session_recording: true,
		persistence: 'localStorage',
	});

	if (userId) {
		posthog.identify(userId, username ? { username } : undefined);
	}
}

export async function identifyUser(userId: string, username: string) {
	const posthog = await getPosthog();
	posthog?.identify(userId, { username });
}

export async function resetUser() {
	const posthog = await getPosthog();
	posthog?.reset();
}

export async function capture(event: string, properties?: Record<string, unknown>) {
	const posthog = await getPosthog();
	posthog?.capture(event, properties);
}
