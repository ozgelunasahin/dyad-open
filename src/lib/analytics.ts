/**
 * PostHog analytics wrapper — currently disabled.
 *
 * Re-enable after privacy/reliability fixes land (#101).
 * All exports are no-ops so callers don't need to change.
 */

export async function initPosthog(_apiKey: string, _userId?: string, _username?: string) {}
export async function identifyUser(_userId: string, _username: string) {}
export async function resetUser() {}
export async function capture(_event: string, _properties?: Record<string, unknown>) {}
