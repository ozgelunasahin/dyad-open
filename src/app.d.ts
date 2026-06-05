// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { IdentityPort } from '@prefig/upact';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			user: User | null;
			session: Session | null;
			identityPort: IdentityPort;
			/**
			 * Active (non-revoked, non-retired) scope memberships for the current
			 * user. Empty array for anonymous visitors. Populated once per request
			 * in hooks.server.ts via get_my_access_context() and read by
			 * prompt-query.ts listing methods to gate scoped prompts. See
			 * migrations 20260508180000 and 20260605100400.
			 */
			scopes: string[];
			/**
			 * Corner-exclusive context (guest members): the home corner slug, or
			 * null for commons members. When set, listing surfaces show only this
			 * corner. See migration 20260605100200.
			 */
			homeScope: string | null;
			/** Region key of the home corner (e.g. 'amsterdam'), or null. */
			homeRegion: string | null;
			/**
			 * Guest access window end (ISO timestamp), or null for permanent
			 * members. The access gate in hooks.server.ts blocks expired guests.
			 */
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
