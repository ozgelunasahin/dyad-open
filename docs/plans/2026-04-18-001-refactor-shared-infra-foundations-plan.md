---
title: "IdentityService abstraction — the remaining shared-infra foundation"
type: refactor
status: active
date: 2026-04-18
origin: docs/plans/2026-04-17-feat-interop-roadmap-plan.md
---

# IdentityService abstraction — the remaining shared-infra foundation

## Overview

Introduce a vendor-neutral `UserIdentity` shape and `requireIdentity` helper so the ~50 direct references to `locals.user.id` in server code stop leaking Supabase-Auth details into request handlers. Behaviour unchanged; one swap point added for any future auth-provider migration (Authentik, Keycloak, DID-backed identity).

This is the remaining piece of the shared-infra foundations work. The other four quick wins — sovereignty verifications, `StorageService`, asset-URL extraction, and the `app.current_user_id()` SQL wrapper — shipped together in PR #120.

## Problem Frame

Every API handler and page server loader under `src/routes/` today reads `locals.user!.id` directly. That couples the application layer to the shape of a Supabase `User` object: the `.id` field, the nullable email, the `app_metadata` / `user_metadata` split, and the implicit assumption that auth state lives on `locals.user`.

The shape we want to depend on is narrower: `{ id, email?, metadata? }` — enough for audit trails and personalisation, nothing more. Anything that needs the raw Supabase `User` keeps using `requireAuth`; anything that only needs identity uses the new helper. One swap point covers a provider migration later, instead of forty grep-and-replace passes.

This was M2 §1 in the 2026-04-17 interop roadmap. Previously bundled with Units 1, 2, 3, 5; separated out because those units are small, low-risk, and landed cleanly without waiting on this refactor.

## Requirements Trace

- **R1.** Introduce a vendor-neutral `UserIdentity` shape and `requireIdentity` helper so the ~50 call-site references to `locals.user.id` go through one opaque type. Switching auth providers later changes one file, not forty. (origin M2 §1)

## Scope Boundaries

- **Not in this plan:** touching the ~20 server files that reference `locals.user` without reading `.id`. Those stay on `requireAuth` — the raw `User` object is the right shape for their callers (session handling, login guards, typed redirects).
- **Not in this plan:** rewriting the 38 existing `auth.uid()` SQL call sites. The `app.current_user_id()` wrapper shipped in PR #120 is additive; RLS/SECURITY-DEFINER rewrites are explicitly deferred to when those policies are touched for other reasons.
- **Not in this plan:** introducing `locals.identity` on `RequestEvent`. Deferred to implementation — see Open Questions.
- **Not in this plan:** adapter-node, Resend → Mailjet, `@dyad/location` NPM extraction, reputation-VC vocabulary, GDPR export. Each warrants its own plan.

## Context & Research

### Relevant code and patterns

- **`requireAuth` helper** — `src/lib/server/auth.ts` is the existing single entry point for authenticated request handlers. `requireIdentity` sits alongside it, returning `UserIdentity` instead of a Supabase `User`.
- **Service interface + Supabase implementation pattern** — the convention is an interface + a class, but `IdentityService` is almost pure transform, so the initial shape is a type + two pure functions (`requireIdentity`, `identityFromUser`). Promoting to a class is a future call if non-trivial methods appear.
- **Integration test auth fixtures** — `tests/helpers/auth.ts` seeds real users against local Supabase; identity helpers work off the same session object without test-factory changes.
- **`handleServiceError` + 401 semantics** — `requireIdentity` throws the same 401 as `requireAuth`. The wider error-surface contract stays intact.

### Institutional learnings

- `docs/solutions/architecture/sovereignty-lessons-learned.md` §4 — this refactor is the application-layer equivalent of the `app.current_user_id()` SQL wrapper. Same principle, different layer.
- `docs/solutions/architecture/service-layer-and-test-portability-patterns.md` — the swap-point pattern the new helper extends.

### Current surface (measured 2026-04-18)

| Surface | Files | References | Notes |
|---|---|---|---|
| `locals.user.id` / `locals.user!.id` / `locals.user?.id` | ~10 files | ~50 sites | this refactor's target |
| `locals.user` without `.id` (existence checks, email reads) | ~20 files | many | stays on `requireAuth` |
| `auth.uid()` in migrations | 38 refs | — | additive wrapper landed in PR #120; bulk rewrite intentionally deferred |

## Key Technical Decisions

- **`IdentityService` is a type + helper pair, not a class.** No behaviour to encapsulate yet. `UserIdentity { id; email?; metadata? }` is a shape; `requireIdentity(locals)` and `identityFromUser(user)` are the entry points. Classy shape (`IdentityService` interface + `SupabaseIdentityService` class) waits for a method that actually does something.
- **`requireAuth` stays.** Consumers that need the raw Supabase `User` (session metadata, email confirmation state, `app_metadata`) keep using it. `requireIdentity` is a narrower view for the ~50 call sites that only need `id`.
- **No `locals.identity` population in this plan.** Adding a field to `App.Locals` ripples through types, hooks, and SSR. `requireIdentity(locals)` reads `locals.user` internally; the hooks stay unchanged. Revisit if multiple callers start double-calling `requireIdentity` per request.
- **Refactor in two commits.** First: land the helper + its test, zero call-site changes. Second: swap the ~10 call-site files. Keeps the diff reviewable and gives a clean rollback surface if something breaks.

## Open Questions

### Resolved during planning

- **Q: Does `UserIdentity` need to be reactive / available on client?** Resolved: no, server-only. Client code reads `data.username` / `data.user.email` via page data as today.
- **Q: Do we migrate `requireAuth` away, or keep it?** Resolved: keep. `requireAuth` is the right shape for consumers that need the raw `User`.

### Deferred to implementation

- Exact helper name — `requireIdentity(locals)` vs `getIdentity(locals)` vs something else. Pick during implementation once the first call-site refactor reveals which reads most naturally in context.
- Whether to populate `locals.identity` via `src/hooks.server.ts`. Decide if a second caller in the same request handler starts reaching for `requireIdentity` twice. Not blocking for this plan.

## Implementation Units

- [ ] **Unit 1: `IdentityService` — type, helpers, test**

**Goal:** Define `UserIdentity`, `identityFromUser`, `requireIdentity`. No call-site changes in this commit — helper lands first so the swap is a mechanical second commit.

**Requirements:** R1

**Dependencies:** PR #120 merged (so the branch starts from a clean main without `locals.user` touch-area conflict).

**Files:**
- Create: `src/lib/services/identity.ts`
- Create: `src/lib/services/identity.test.ts`

**Approach:**
- `UserIdentity` is exported as a `type` alias: `{ id: string; email?: string; metadata?: Record<string, unknown> }`.
- `identityFromUser(user: User): UserIdentity` is a pure transform — strips `app_metadata`, `aud`, `role`, `confirmed_at`, and anything else not in `UserIdentity`.
- `requireIdentity(locals: App.Locals): UserIdentity` calls `requireAuth(locals.user)` and passes the result through `identityFromUser`. Throws the same 401 on missing auth.
- Zero call-site changes this commit — lets reviewers validate the helper in isolation.

**Patterns to follow:**
- `src/lib/server/auth.ts` for the `requireAuth` signature + 401 semantics.
- `src/lib/services/prompt-query.ts` for the file header comment style.

**Test scenarios:**
- Happy path — `requireIdentity` against a populated `locals.user` returns `{ id, email, metadata }` with the expected values.
- Auth failure — `requireIdentity` against `locals.user === null` throws with `401` (mirror the existing `requireAuth` test exactly).
- Transform strictness — `identityFromUser` drops `app_metadata`, `aud`, `role` from a Supabase `User` object. No auth-provider fields leak through.

**Verification:**
- `src/lib/services/identity.ts` exports `UserIdentity`, `identityFromUser`, `requireIdentity`.
- `npx vitest run src/lib/services/identity.test.ts` passes.
- No other files changed in this commit.

---

- [ ] **Unit 2: Swap ~10 call-site files to `requireIdentity`**

**Goal:** Replace `locals.user!.id` (and variants) with `requireIdentity(locals).id` across the ~50 call sites. Pure mechanical change; behaviour identical.

**Requirements:** R1

**Dependencies:** Unit 1

**Files:**
- Modify: `src/routes/api/upload/+server.ts` (already uses `requireAuth` post-PR-120 — just rewire to `requireIdentity` if it's still the narrower shape this handler wants)
- Modify: `src/routes/api/prompts/+server.ts`
- Modify: `src/routes/api/prompts/[id]/+server.ts`
- Modify: `src/routes/api/prompts/[id]/publish/+server.ts`
- Modify: `src/routes/api/prompts/[id]/unpublish/+server.ts`
- Modify: `src/routes/api/prompts/[id]/republish/+server.ts`
- Modify: `src/routes/api/prompts/[id]/slots/+server.ts`
- Modify: `src/routes/api/prompts/[id]/comments/+server.ts`
- Modify: `src/routes/api/prompts/[id]/invitations/+server.ts`
- Modify: `src/routes/api/meetings/+server.ts`
- Modify: `src/routes/api/meetings/[id]/+server.ts`
- Modify: `src/routes/api/meetings/[id]/cancel/+server.ts`
- Modify: `src/routes/api/meetings/[id]/feedback/+server.ts`
- Modify: `src/routes/api/invitations/[id]/+server.ts`
- Modify: `src/routes/api/invitations/[id]/accept/+server.ts`
- Modify: `src/routes/api/feedback/app/+server.ts`
- Modify: `src/routes/api/feedback/[id]/+server.ts`
- Modify: `src/routes/api/notifications/+server.ts`
- Modify: `src/routes/api/invites/+server.ts`
- Modify: `src/routes/api/vocabulary/+server.ts`
- Modify: `src/routes/api/locations/search/+server.ts`
- Modify: `src/routes/(app)/discover/+page.server.ts`
- Modify: `src/routes/(app)/profile/+page.server.ts`
- Modify: `src/routes/(app)/feedback/[id]/+page.server.ts`
- Modify: `src/routes/(app)/meetings/[id]/+page.server.ts`
- Modify: `src/routes/(app)/conversations/[id]/+page.server.ts`
- Modify: `src/routes/(editor)/conversations/[id]/edit/+page.server.ts`
- Modify: `src/routes/+page.server.ts`

**Approach:**
- For each file, replace `locals.user!.id` / `locals.user!?.id` / `locals.user?.id` (used as a userId) with `requireIdentity(locals).id`.
- Files that also need the Supabase `User` for other reasons (reading `.email`, checking `email_confirmed_at`) keep `requireAuth(locals.user)` alongside, or read identity + raw user separately.
- Files that only check `locals.user` existence (no `.id` usage) stay on `requireAuth` or inline null-check — they're not in scope.
- The integration test at `/api/prompts/[id]` PATCH is the canary — verify it still passes before moving on.

**Patterns to follow:**
- `src/routes/api/upload/+server.ts` post-PR-120 — already has the `requireAuth` + `handleServiceError` shape that works.

**Test scenarios:**
- Canary integration — PATCH `/api/prompts/[id]` with valid title update succeeds end-to-end through `requireIdentity`.
- Auth failure — unauthenticated request to any rewritten endpoint still returns 401 with the same error shape (no behaviour change).
- No regressions — the existing 88-test unit suite and the integration suite both pass.

**Verification:**
- `grep -rn 'locals\.user!\?\.id\|locals\.user\.id' src/routes/` returns zero matches.
- `grep -rn 'locals\.user' src/routes/` still returns the ~20 files that check existence or read `.email` — those are out of scope.
- `npx svelte-check --threshold error` remains at 0 errors.
- `npm test` passes; `npm run test:integration:local` passes against local Supabase.

---

## System-Wide Impact

- **Interaction graph:** Unit 2 touches every authenticated handler. A mistake propagates to every request. Mitigation: land Unit 1 separately so the helper gets isolated scrutiny; keep Unit 2 a pure mechanical swap with the canary integration test as the end-to-end proof.
- **Error propagation:** `requireIdentity` preserves `requireAuth`'s 401 contract. No change to how API routes or page loaders surface auth errors.
- **State lifecycle risks:** None. No persistence changes; no cache invalidation; no new network calls.
- **API surface parity:** Server-only change. No HTTP contract changes.
- **Integration coverage:** Unit 2 is validated by the existing integration suite running against real Supabase. The canary PATCH test is the explicit end-to-end proof; the rest of the suite catches drift.
- **Unchanged invariants:** `requireAuth` continues to exist and behave identically. `locals.user` is still populated by hooks. The 38 SQL `auth.uid()` call sites are untouched.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Unit 2 lands concurrently with another branch touching `locals.user.id` → merge conflicts. | Check open PRs for `locals.user` diffs before starting. If any are mid-flight, wait or coordinate. |
| `identityFromUser` drops a field someone was silently depending on via `locals.user.user_metadata`. | Grep for `user_metadata` / `app_metadata` consumers before landing. Any real consumer stays on `requireAuth`. |
| 401 semantics drift subtly — `requireIdentity` throws a different shape than `requireAuth`. | Mirror `requireAuth`'s throw exactly. Dedicated auth-failure test case in Unit 1. |

## Documentation / Operational Notes

- No user-visible rollout. Zero-downtime deploy.
- Optional post-merge: add a CLAUDE.md one-liner noting "for handlers that only need user id, prefer `requireIdentity` over `requireAuth`." Not strictly required — pattern discoverable from the helper's file-level comment.

## Sources & References

- **Origin document:** [docs/plans/2026-04-17-feat-interop-roadmap-plan.md](docs/plans/2026-04-17-feat-interop-roadmap-plan.md) — M2 §1.
- Related PR: [#120 — shared-infra foundations quick wins (units 1, 2, 3, 5)](https://github.com/theodore-evans/dyad.berlin/pull/120) — the sibling work this plan depends on landing first.
- `docs/solutions/architecture/sovereignty-lessons-learned.md` §4 — sibling lesson for the SQL layer (shipped as `app.current_user_id()` in PR #120).
- `docs/solutions/architecture/service-layer-and-test-portability-patterns.md` — service-layer pattern this helper extends.
- Related code: `src/lib/server/auth.ts`, `src/lib/services/prompt-query.ts`, `tests/helpers/auth.ts`.

## Completed sibling work (rolled up into PR #120)

The earlier scope of this plan covered four additional units that have since landed together:

- ✅ **Unit 1 (old): Sovereignty verifications.** Leaflet confirmed self-hosted; Supabase EU Ireland confirmed via dashboard. Scorecard updated.
- ✅ **Unit 2 (old): `StorageService` abstraction.** `src/lib/services/storage.ts` + test; upload endpoint refactored; test factory updated.
- ✅ **Unit 3 (old): Asset URL extraction.** 17 hardcoded Supabase URLs in `/why` consolidated into `PUBLIC_ASSET_BASE_URL` with backwards-compatible fallback; `.env.example` + CLAUDE.md updated.
- ✅ **Unit 5 (old): `app.current_user_id()` wrapper.** Additive migration; no existing policies rewritten; CLAUDE.md convention note added.

They are intentionally not re-documented here — PR #120 and the original plan revision are the source of record. This plan is scoped to the remaining `IdentityService` work only.
