# Security

Reporting and threat-model notes for `dyad.berlin`. The platform is in alpha and the team is small; we read every report.

## Reporting a vulnerability

Email `hello@dyad.berlin` with the details. Please do **not** open a public GitHub issue, post to social media, or share the details with third parties before we have had a chance to respond.

What helps:

- A clear description of the issue and the impact.
- Steps to reproduce, or a proof-of-concept where one is reasonable.
- Whether you have shared the report with anyone else.
- Whether you would like to be credited (and how).

We aim to acknowledge reports within five working days. The platform is maintained by a small team, so timelines for fixes vary with severity. We will keep you informed.

We do not currently run a paid bug-bounty programme.

## Scope

In scope:

- The application code in this repository.
- The deployed `dyad.berlin` and `admin.dyad.berlin` surfaces.
- Database migrations and RLS policies under `supabase/migrations/`.

Out of scope:

- Issues in upstream dependencies — please report those to the upstream project. If a dependency issue affects us specifically, the report is welcome.
- Denial-of-service from raw traffic volume.
- Findings that require a malicious browser extension or compromised endpoint to reproduce.
- Social-engineering or physical attacks on team members.
- Self-XSS that requires the victim to paste attacker-controlled content into their own browser console.

## Authentication model — what to look at first

The application has two distinct authentication tiers; if you find a way to cross between them, that is the most interesting kind of finding.

**User tier.** Members authenticate against the upact identity port (`@prefig/upact-supabase` adapter, backed by Supabase Auth). The application sees a small `Upactor` value, not raw substrate state. Row-level security on `profiles` and the domain tables enforces per-user access via `app.current_user_id()` — a custom SQL function that resolves the JWT subject through the `identities` table. The architectural reasoning, including the privacy minima the port enforces, is in the upact spec.

**Admin tier.** The admin plane (`admin.dyad.berlin/*`) is gated by Cloudflare Zero Trust (Access) at the edge. Operator identity lives in Cloudflare's identity provider integrations — the application has no admin login flow, no admin `auth.users` row, and no admin session. dyad authorizes admin requests by verifying the `Cf-Access-Jwt-Assertion` token against Cloudflare's published JWKS; the convenience `Cf-Access-Authenticated-User-Email` header is consulted only when no JWT is emitted, and exercising that fallback path emits a structured warning so misconfiguration is observable. Requests to hostnames not enrolled in the canonical deployment are 404'd before any admin-auth code runs (see `src/lib/server/route-kind.ts`). The admin plane uses a service-role Supabase client, bypassing RLS by design. Authorization for the admin plane is implemented in `src/lib/server/admin-auth.ts`.

A vulnerability that lets a user-tier identity reach the admin plane, or that lets the admin plane be reached without a valid Cloudflare Access assertion, is the highest-severity class of finding for this codebase.

## Boundaries we have already named

These are known properties of the system, not vulnerabilities — but they shape what is and isn't worth reporting:

- **Service-role key compromise = database compromise.** The admin plane uses the service-role client. If the service-role key leaks, an attacker can rewrite `identities` rows and impersonate any user across all RLS policies. Mitigation: the key is held only by the deployment environment; rotate via Supabase dashboard in the event of a leak.
- **`auth.uid()` vs `app.current_user_id()`.** New RLS policies and SECURITY DEFINER functions must use `app.current_user_id()`. A copy-paste of `auth.uid()` into a new policy creates a silent split-brain. We have integration coverage that asserts no `auth.uid()` policies exist on the active domain tables.
- **`{@html}` is a trust boundary.** Every use must route through DOMPurify or an explicit protocol allowlist. New `{@html}` use without sanitization is a vulnerability.
- **Internal error messages must not leak.** API handlers wrap `request.json()` in try/catch and return generic messages. Supabase or Resend errors are logged server-side, not echoed to the client.
- **Admin authorization is layered: hostname allowlist + JWT verification.** Cloudflare Access controls *who* can reach the admin plane, but two application-level protections defend against Cloudflare configuration drift:
  - **Hostname allowlist** (`src/lib/server/route-kind.ts`): only canonical hostnames (`dyad.berlin`, `admin.dyad.berlin`) reach the admin gate. Cloudflare Pages preview deployments are admitted for non-admin paths only; admin paths on any non-canonical hostname are 404'd before any admin-auth code runs. This is the load-bearing protection if a Cloudflare Access application is misconfigured or a new deployment hostname is added without being enrolled.
  - **JWT-first precedence** (`src/lib/server/admin-auth.ts`): when a `Cf-Access-Jwt-Assertion` is present, it is verified against Cloudflare's published JWKS and is authoritative. A failing JWT rejects the request, even if a `Cf-Access-Authenticated-User-Email` header is also set. The header fallback is admitted only when **(a)** no JWT is emitted AND **(b)** the verifier is wired (`CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` are configured). With env vars absent, both the JWT and header paths hard-reject — admin admission requires a working cryptographic check. The fallback path emits a structured warning so the operations team can correlate the fallback against Cloudflare configuration changes.
  - The `tests/security-poc/` directory contains acceptance tests that pin both protections. See `admin-bypass-hostname.test.ts` and `admin-bypass-jwt-precedence.test.ts`.

## What changes invite a security review

Anything in this list should be reviewed against this document before merging:

- New API routes under `src/routes/api/` that mutate data.
- New RLS policies or SECURITY DEFINER functions.
- Changes to `src/lib/server/admin-auth.ts` or to the admin gate in `src/hooks.server.ts`.
- New uses of `{@html}` or new HTML email templates.
- Changes to identity resolution (the upact adapter, `app.current_user_id()`, the `identities` table).
- New third-party dependencies that handle authentication, sessions, or user-supplied content.

## Disclosure

We prefer coordinated disclosure: report privately, give us a window to ship a fix, then publish. Where a fix is impractical (an upstream dependency, a class of issue rather than a single bug), we will say so plainly and credit the reporter for the finding.
