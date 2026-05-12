import { describe, it, expect } from 'vitest';
import { createAdminClient } from '../helpers/auth.js';

/**
 * Drift guard for the auth.uid() -> app.current_user_id() migration.
 *
 * All RLS policies on public-schema tables should use `app.current_user_id()`
 * (defined in `20260418120000_add_app_current_user_id.sql`) rather than
 * `auth.uid()` directly. The wrapper is the single swap point for moving the
 * identity layer off Supabase Auth in future.
 *
 * This test fails if any policy still mentions `auth.uid(` anywhere in its
 * qual or with_check expression. A future PR that copy-pastes `auth.uid()`
 * from an older migration fails on the first CI run.
 *
 * The audit goes through `audit_rls_policies_using_auth_uid()` because
 * supabase-js can't query `pg_policies` directly through PostgREST.
 */
describe('RLS policies do not reference auth.uid() directly', () => {
	it('audit_rls_policies_using_auth_uid returns an empty list', async () => {
		const admin = createAdminClient();
		const { data, error } = await admin.rpc('audit_rls_policies_using_auth_uid');

		expect(error, error?.message).toBeNull();
		expect(data, 'audit function returned null').not.toBeNull();

		const offenders = (data ?? []).map(
			(row: { tablename: string; policyname: string }) =>
				`${row.tablename}.${row.policyname}`
		);
		expect(
			offenders,
			`RLS policies still using auth.uid() directly: ${offenders.join(', ')}. ` +
				`Switch to app.current_user_id() so the identity wrapper stays the single ` +
				`swap point. See supabase/migrations/20260418120000_add_app_current_user_id.sql.`
		).toEqual([]);
	});
});
