// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			user: User | null;
			session: Session | null;
			/** Active (non-revoked, non-retired) scope memberships for the current user. */
			scopes: string[];
			/** Corner-exclusive context: the home corner slug, or null for commons members. */
			homeScope: string | null;
			/** Region key of the home corner (e.g. 'amsterdam'), or null. */
			homeRegion: string | null;
			/** Region implied by the request hostname, or null for the default host. */
			hostRegion: string | null;
			/** Guest access window end (ISO timestamp), or null for permanent members. */
			accessExpiresAt: string | null;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				PUBLIC_SUPABASE_URL: string;
				PUBLIC_SUPABASE_ANON_KEY: string;
			};
			context?: {
				waitUntil(promise: Promise<unknown>): void;
			};
		}
	}
}

export {};
