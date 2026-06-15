import type { SupabaseClient } from '@supabase/supabase-js';

export interface ScopeMembership {
	scope: string;
	name: string;
}

export interface ScopeService {
	listMyScopes(userId: string): Promise<ScopeMembership[]>;

	autoGrantOnJoin(input: {
		identityId: string;
		scope: string;
		grantedBy: string | null;
	}): Promise<void>;
}

export class SupabaseScopeService implements ScopeService {
	// Construct with the locals.supabase client for user-facing reads (RLS
	// applies). Construct with the admin client for autoGrantOnJoin and other
	// admin-originated writes (no user context exists yet on signup).
	constructor(private supabase: SupabaseClient) {}

	async listMyScopes(userId: string): Promise<ScopeMembership[]> {
		const { data: grants } = await this.supabase
			.from('identity_scopes')
			.select('scope')
			.eq('identity_id', userId)
			.is('revoked_at', null);

		const slugs = (grants ?? []).map((g) => g.scope as string);
		if (slugs.length === 0) return [];

		const { data: scopes } = await this.supabase
			.from('scopes')
			.select('scope, name')
			.in('scope', slugs)
			.is('retired_at', null);

		return (scopes ?? []) as ScopeMembership[];
	}

	async autoGrantOnJoin(input: {
		identityId: string;
		scope: string;
		grantedBy: string | null;
	}): Promise<void> {
		const { error } = await this.supabase.from('identity_scopes').insert({
			identity_id: input.identityId,
			scope: input.scope,
			granted_by: input.grantedBy
		});
		if (error) {
			throw new Error(`auto-grant failed: ${error.message}`);
		}
	}
}
