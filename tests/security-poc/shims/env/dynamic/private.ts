// Test shim for $env/dynamic/private. The PoCs construct their own
// flags and verifier; production env is irrelevant to the unit-level
// reproduction.
export const env: Record<string, string | undefined> = {
	CF_ACCESS_TEAM_DOMAIN: undefined,
	CF_ACCESS_AUD: undefined,
	ADMIN_DEV_BYPASS: undefined
};
