# Security regression tests — admin-plane bypass surfaces

Regression tests for two admin-plane bypass surfaces that were closed and must stay closed. A change that re-introduces either surface will fail these tests.

## Running

The PoCs live outside the main unit-test glob (`src/**/*.test.ts`) so they can carry their own SvelteKit virtual-module shims without polluting the main test environment.

```sh
npx vitest run --config tests/security-poc/vitest.config.ts
```

## What each file pins

### `admin-bypass-hostname.test.ts`

**Surface.** The admin gate matched on path prefix, so a request to any non-canonical hostname (Pages preview URLs, staging mirrors, legacy custom domains) with a spoofed `Cf-Access-Authenticated-User-Email` header was admitted to the admin plane.

**Protection.** `src/lib/server/route-kind.ts` classifies inbound requests by hostname; `src/hooks.server.ts` 404s non-canonical hostnames before any admin-auth code runs. Cloudflare Pages preview URLs matching the project's `*.<project>.pages.dev` scope are admitted for non-admin paths only.

**What the test asserts.** The `routeKind` decision returns `'reject'` for non-canonical hostname + admin-path combinations. A canary case pins the defence-in-depth boundary: `resolveAdminOperator` still admits a spoofed header *when called in isolation*, but the routing layer short-circuits before admin-auth runs in the live request chain.

### `admin-bypass-jwt-precedence.test.ts`

**Surface.** `resolveAdminOperator` trusted `Cf-Access-Authenticated-User-Email` verbatim and never consulted `Cf-Access-Jwt-Assertion` when both headers were present. A forged email header was authoritative over a real JWT.

**Protection.** JWT-first precedence in `src/lib/server/admin-auth.ts`. Present JWT is authoritative (fails → reject regardless of any header). Empty-value JWT header rejects (proxies that strip the value but not the name cannot trigger silent fallback). Header-only path admits the email value without cryptographic verification, emitting a `console.error` audit signal — Cloudflare being the only path to the origin is the load-bearing precondition for that path's safety. See `SECURITY.md` for the layered model.

**What the test asserts.** Each of the three precedence outcomes (JWT-verifies → admit JWT identity; JWT-fails → reject; JWT-absent → fall back to header trust) plus the audit-log signal on the fallback path.

## End-to-end reproducer

`repro-curl.sh` is a manual reproducer for verifying the hostname protection against a real deployment. It is not run by vitest.
