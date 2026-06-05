/** Row shape returned by the get_my_access_context RPC (migration
 *  20260605100400). Shared by hooks.server.ts and the access-ended page so
 *  the two casts cannot drift from each other. */
export interface AccessContextRow {
	scopes: string[] | null;
	access_expires_at: string | null;
	home_scope: string | null;
	home_region: string | null;
}

/** Narrow an RPC result to its first context row, if any. */
export function firstAccessContextRow(data: unknown): AccessContextRow | undefined {
	return (data as AccessContextRow[] | null)?.[0];
}
