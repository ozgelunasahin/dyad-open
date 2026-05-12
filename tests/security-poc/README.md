# Security PoCs — admin-plane bypass surfaces (regression tests)

Durable regression tests for the two highest-severity findings from the 2026-05-12 red-team pass against `dyad.berlin` + `@prefig/upact-supabase`.

**History.** These files were authored as vulnerable-shape snapshots: they passed *because* the gate was permissive, demonstrating the bypass surfaces. After the M1 milestone of `docs/plans/2026-05-12-001-fix-admin-gate-and-port-grounding-plan.md` landed, they were refactored to import the production helpers (`src/lib/server/route-kind.ts`, `src/lib/server/admin-auth.ts`) and now pin the post-fix protection. A regression that re-introduces either bypass surface will surface as these tests failing.

## Running

The PoCs live outside the main unit-test glob (`src/**/*.test.ts`) so they can carry their own SvelteKit virtual-module shims without polluting the main test environment.

```sh
npx vitest run --config tests/security-poc/vitest.config.ts
```

## Findings under test

### Finding 1 — Non-canonical hostname admin bypass (HIGH, fixed)

**File:** `admin-bypass-hostname.test.ts`

**Original vulnerability.** The admin gate in `src/hooks.server.ts` admitted requests to `/admin/*` based on path-or-hostname, and `src/lib/server/admin-auth.ts` trusted `Cf-Access-Authenticated-User-Email` verbatim. Any deployment hostname not enrolled in the production Cloudflare Access application — Pages preview URLs, staging mirrors, legacy custom domains — could serve `/admin/*` with a spoofed header.

**Fix (M1 Unit 1.1).** A pure helper `src/lib/server/route-kind.ts` classifies inbound requests into `'admin' | 'apex-redirect' | 'user' | 'reject'` based on hostname allowlist. Non-canonical hostnames return `'reject'`; `src/hooks.server.ts` 404s those before any admin-auth code runs. Cloudflare Pages preview hostnames matching the project's `*.<project>.pages.dev` scope are admitted for non-admin paths only (preserves the review workflow); admin paths on preview hostnames are always rejected.

**Regression-test contract.** The test file imports `routeKind` from the production module and asserts the `'reject'` outcome for non-canonical hostname + admin-path combinations. It also pins the defence-in-depth boundary: `resolveAdminOperator` still admits a spoofed header *when called in isolation*, but the routing-layer protection short-circuits before admin-auth runs in the request chain.

### Finding 2 — Header-only admin trust (HIGH, fixed)

**File:** `admin-bypass-jwt-precedence.test.ts`

**Original vulnerability.** `resolveAdminOperator` trusted `Cf-Access-Authenticated-User-Email` and never consulted `Cf-Access-Jwt-Assertion` when both were present. A forged email header was authoritative over a real JWT.

**Fix (M1 Unit 1.2).** JWT-first precedence: if `Cf-Access-Jwt-Assertion` is present and verifies → admit the JWT-claimed identity; if it's present and fails → reject regardless of any email header; if it's absent → fall back to header trust (with a `console.error` audit signal so production exercise of the fallback path is observable). The empty-value JWT header case is also rejected — proxies that strip the value but not the name cannot trigger silent fallback.

**Regression-test contract.** The test asserts each of the three precedence outcomes plus the audit-log signal on the fallback path. If a refactor removes the `console.error` or re-inverts the precedence, the test fails.

## Out-of-band reproducer (manual)

`repro-curl.sh` is a sketch for end-to-end verification against a real deployment — useful when the hostname allowlist needs to be confirmed in a specific Cloudflare environment. It is not run by `vitest`.
