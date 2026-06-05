import { PUBLIC_SUPABASE_URL } from '$env/static/public';

const IS_LOCAL =
	PUBLIC_SUPABASE_URL?.includes('localhost') || PUBLIC_SUPABASE_URL?.includes('127.0.0.1');

/**
 * Derive the user-app origin from the Supabase URL or fall back to
 * production. Used wherever the admin plane builds links into the user app
 * (invite emails, group join links).
 */
export const APP_ORIGIN = IS_LOCAL ? 'http://localhost:5173' : 'https://dyad.berlin';

/**
 * Production host for each region that serves the app on its own domain.
 * A conference corner's group link must point at the host its guests will
 * live under (sessions are host-scoped cookies — see hooks.server.ts), or
 * the QR deposits them on dyad.berlin and the corner experience never
 * starts. Regions absent here fall back to APP_ORIGIN.
 */
const REGION_ORIGINS: Record<string, string> = {
	amsterdam: 'https://dyad.amsterdam'
};

/**
 * Origin a group join link should use for a corner in the given region.
 * Locally everything is one dev server (conference hosts don't resolve), so
 * dev always returns APP_ORIGIN regardless of region.
 */
export function joinOrigin(region: string | null | undefined): string {
	if (IS_LOCAL) return APP_ORIGIN;
	return (region && REGION_ORIGINS[region]) || APP_ORIGIN;
}
