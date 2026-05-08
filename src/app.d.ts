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
			 * Active (non-revoked) scope memberships for the current user. Empty
			 * array for anonymous visitors. Populated once per request in
			 * hooks.server.ts and read by prompt-query.ts listing methods to gate
			 * scoped prompts. See migration 20260508180000.
			 */
			scopes: string[];
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				PUBLIC_SUPABASE_URL: string;
				PUBLIC_SUPABASE_ANON_KEY: string;
			};
		}
	}
}

export {};
