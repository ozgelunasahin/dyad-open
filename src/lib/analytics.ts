/**
 * Analytics wrapper around Plausible's `window.plausible()` global.
 *
 * Behavior:
 *   - When the Plausible script is loaded (production with PUBLIC_PLAUSIBLE_DOMAIN
 *     set, or local dev with the layout's gate satisfied), `capture()` calls the
 *     global with the event name and props.
 *   - When the script is absent (no domain configured, ad blocker, network
 *     failure, SSR context), `capture()` is a no-op. Callers don't need to
 *     guard the call.
 *
 * Posture:
 *   - Aggregate, anonymous, no per-user identification. Plausible is cookieless
 *     by design; this wrapper preserves that.
 *   - Properties are minimal — no content, no third-party identifiers. The
 *     EventName union below documents what's allowed.
 *   - Fire-and-forget: no batching, no buffering, no retry. Failure is silent.
 */

/**
 * Allowed event names. Adding a new event means adding it here first — typos
 * surface as compile errors via svelte-check, and the union is the source of
 * truth for the Plausible Goals dashboard.
 */
export type EventName =
	| 'conversation_published'
	| 'conversation_unpublished'
	| 'conversation_deleted'
	| 'slots_changed'
	| 'response_sent'
	| 'invitation_sent'
	| 'invitation_withdrawn'
	| 'invitation_accepted'
	| 'invitation_declined'
	| 'meeting_cancelled'
	| 'feedback_submitted'
	| 'group_feedback_submitted';

export type AnalyticsProps = Record<string, string | number | boolean>;

interface PlausibleGlobal {
	(eventName: string, options?: { props?: AnalyticsProps }): void;
}

declare global {
	interface Window {
		plausible?: PlausibleGlobal;
	}
}

export function capture(eventName: EventName, props?: AnalyticsProps): void {
	if (typeof window === 'undefined') return;
	const plausible = window.plausible;
	if (typeof plausible !== 'function') return;
	plausible(eventName, props ? { props } : undefined);
}
