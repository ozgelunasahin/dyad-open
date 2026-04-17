---
title: "fix: security + reliability sweep for test-user readiness"
type: fix
status: active
date: 2026-04-16
origin: "in-conversation test-readiness review (2026-04-16)"
---

# fix: security + reliability sweep for test-user readiness

## Overview

This plan addresses the P0/P1 findings from the 2026-04-16 readiness review that block handing dyad.berlin to real test users. It bundles 8 fixes into one focused PR: 5 security (XSS fallback, feedback_forms grants, profiles RLS, CSRF logout, shared error handler) and 3 reliability (publish transactionality, accept-invitation idempotency, Nominatim timeout).

Scope is intentionally narrow — UX dead-ends, profile simplification, observability, and open GH issues are separate PRs (B/C/D in the readiness review).

## Problem Frame

dyad.berlin is about to accept real test users writing personal conversation prompts, scheduling in-person meetings with exact locations, and giving post-meeting feedback. Three classes of problem show up on audit:

1. **Two actively exploitable paths exist.** A prompt author can deliver stored XSS to every viewer via the TipTap `body_html` fallback. A meeting participant can bypass the simultaneous-reveal invariant on `feedback_forms` via direct PostgREST PATCH. Either, once found, compromises platform trust.
2. **Privacy boundaries leak by default.** Any authenticated user can read every row of `profiles` including `join_motivation` (the personal why-I-want-to-join freewrite) and `referred_by` (the referral graph). `/logout` is a GET, so cross-origin prefetches log users out mid-action.
3. **Retry-on-transient-failure dead-ends users.** Publish isn't transactional and re-inserts duplicate slots on retry. Accept-invitation returns an error when the meeting already exists. Nominatim without a timeout can hang publish for 30s.

Every fix below is concrete: specific file, specific fix, matching an existing pattern in the codebase. Nothing here invents new abstractions.

## Requirements Trace

- **R1** — A prompt author cannot deliver script to prompt viewers through the body rendering path. (addresses review sec-2)
- **R2** — A meeting reviewer cannot force their feedback form into `locked` state before the other participant submits. (addresses review sec-1)
- **R3** — An authenticated user can read only `(id, username, display_name, avatar_url)` of other users' profiles. `referred_by` and `join_motivation` are not reachable from the authenticated role. (addresses review sec-5)
- **R4** — `/logout` cannot be triggered by a cross-origin GET (image, prefetch, hotlink). Logout requires a user-initiated POST from dyad.berlin. (addresses review sec-3, todo 019)
- **R5** — Every `/api/*` mutating endpoint returns a generic user-facing error message and logs the full error server-side. No constraint names, table names, or RLS fragments in client responses. Domain errors (user-safe) still surface when the service raises them intentionally. (addresses review sec-4)
- **R6** — Publishing a prompt is atomic: either all slots are inserted and the prompt moves to `published`, or no slots are inserted and the prompt stays `draft`. Retrying publish after a failure does not create duplicate slots. (addresses review reliability-1)
- **R7** — A user who hits accept-invitation twice (due to flaky network or double-tap) receives the same success response both times, with the same `meeting_id`, as long as they are the rightful invitee. (addresses review reliability-2)
- **R8** — A slow or unresponsive Nominatim does not block publish beyond 5–8 seconds per request. On timeout or error, the slot is created with a generic `"Berlin"` area rather than failing publish. (addresses review reliability-3)

## Scope Boundaries

**Non-goals:**
- Profile page simplification — PR B.
- UX dead-ends and copy changes — PR C.
- Observability `events` table — PR D.
- Open GitHub issues (#83, #84, #85, #86, #87, #103, #105) — triaged separately.
- Introducing new error-tracking services (Sentry, etc.).
- Further RLS work on tables beyond `profiles` and `feedback_forms` (e.g., `prompt_comments` state filter — deferred).
- Admin SECURITY DEFINER helper to fetch `join_motivation` / `referred_by` — admin panel already uses service_role; revisit if a non-service-role reader needs this data.
- Full-column MIME-magic-byte validation on uploads, `confirm_user_email` tightening — P3 items in the review, deferred.

## Context & Research

### Relevant code and patterns

**SECURITY DEFINER RPC pattern** — `supabase/migrations/20260405_fix_accept_and_expiry.sql:10-86`. Transactional multi-step operation with row-level locking (`SELECT ... FOR UPDATE`), defensive auth check via `auth.uid()`, post-commit revocation of execute from public. This is the shape to mirror for `publish_prompt` (Unit 6).

**Accept-invitation semantics** — same file, lines 22-82. Already handles `slot_accepted = TRUE` by cancelling the invitation and returning `NULL` — that's the shape for idempotency (Unit 7), except we'll return the existing `meeting_id` if the invitation's own `state = 'accepted'` and the caller is the original invitee.

**Error handling that works** — `src/routes/api/contact/+server.ts:117-123` and `src/routes/api/feedback/app/+server.ts`. Pattern: log with `console.error('[scope] context:', err)`, return a generic message with appropriate status. `sec-4` is about applying this consistently.

**POST-only form action for logout** — `src/routes/(auth)/login/+page.server.ts` already has a `logout` form action. Unit 4 routes the sidebar/nav logout button through that instead of navigating to `/logout`.

**HTML escaping** — `src/lib/utils/escape-html.ts` exports `escapeHtml(str)`. Unit 1 can use it for the fallback path; alternately, delete the fallback entirely.

**RLS column grants** — `supabase/migrations/20260412_restrict_profiles_anon_grant.sql` and `20260413_revoke_profiles_anon_entirely.sql` show how to incrementally lock down the anon role on `profiles`. Unit 3 applies the same pattern to the `authenticated` role.

**Profiles direct reads in code** — `src/lib/server/username-lookup.ts` (server-side, safe under service_role), admin panel loaders, and potentially the profile page loader. Unit 3 verification must grep for direct `.from('profiles').select(...)` calls and confirm none depend on the fields we're revoking.

### Institutional learnings

- `docs/solutions/architecture/sovereignty-lessons-learned.md` — the pattern of routing authenticated reads through service-layer helpers rather than direct PostgREST client calls. Supports Unit 3.
- `docs/solutions/db/rls-insert-policy-constraint.md` (if present — otherwise covered in CLAUDE.md) — RLS policies must constrain targets not just actors. Unit 2 applies this mentality to UPDATE-column-scoping.

### External references

None consumed for this PR. Every fix has a direct in-repo pattern to follow.

## Key Technical Decisions

**D1. Delete the TipTap fallback rather than escape it.** The fallback exists for a case (`renderTiptapToHtml` returns empty string) that should itself be treated as a render error. Keeping the fallback but escaping it would preserve a "lossy" rendering path that's easy to accidentally reintroduce; deleting it makes the renderer's contract clearer. If a corpus of published prompts depends on the fallback in practice, Unit 1 includes a one-time scan to confirm zero impact. (See Open Questions → Deferred to Implementation.)

**D2. Column-scoped GRANT on feedback_forms UPDATE, not full REVOKE.** Full REVOKE closes the door on any future feature that needs a direct content-column update (e.g., client-side draft auto-save of feedback in progress). Column-scoping protects `state`, `locked_at`, `submitted_at`, `created_at`, and the immutable participant references, while leaving the content columns (`did_meet`, `no_show_reason`, `rating_tags`, `free_text`, `share_with_person`, `share_with_platform`, `platform_comments`) updatable by the reviewer. The attack surface is the state columns; protect them specifically.

**D3. Server-side-only for `join_motivation` and `referred_by` in this PR.** The admin panel uses `service_role` and is unaffected by authenticated-role column grants. No app code reads these columns from the `authenticated` role today. Revoking them entirely is the smallest blast radius. If a non-admin reader surfaces later (e.g., a "your invitees" feature), add a SECURITY DEFINER function then.

**D4. `DomainError` class, not uniform-generic in the shared handler.** Services today throw `new Error('Cannot invite yourself')`, `new Error('Comment must be between 1 and 2000 characters')`, etc. These are *user-safe* messages that improve the tester experience. Uniformly genericizing them would replace "Cannot invite yourself" with "Invalid input" — a regression for testers. Introduce a `DomainError` class in `src/lib/domain/errors.ts`; the shared handler surfaces `instanceof DomainError` messages verbatim with appropriate status, genericizes everything else with `console.error`. Services migrate to `throw new DomainError(...)` as we touch them; untouched services fall through the generic path.

**D5. Idempotent accept-invitation returns `meeting_id` for an already-accepted invitation only if the caller is the invitee.** The existing RPC already checks `v_invitee_id != auth.uid()` and raises `'Not authorized'`. The idempotent branch must preserve that guard: if invitation state is `'accepted'` AND caller is the original invitee, look up the meeting and return its id. If state is anything else, or the caller isn't the invitee, behave as today.

**D6. Nominatim timeout falls through to "Berlin" generic area, not publish failure.** The user has already committed to publishing. Failing publish because an external geocoder is slow is a worse UX than a less-specific area label — especially when `general_area` is a coarse grain anyway ("Kreuzberg" vs "Berlin"). Log the timeout for later observability.

**D7. Module-scoped rate limiter in `location.ts` is accepted as best-effort on CF Workers.** Fixing it properly requires a shared KV or Supabase counter — out of scope for this sweep. Add a code comment noting the limitation so future readers don't trust the counter more than they should.

**D8. POST logout via existing form action, not a new `+server.ts`.** The `(auth)/login` page already has a `logout` action. Converting the logout path to a POST form that submits to that action mirrors how other auth mutations work in the codebase. Delete `src/routes/logout/+page.server.ts` after migration; keep `src/routes/logout/` as a fallback-redirect if any bookmarks or emails point there (render a page with an auto-submitting POST form + manual "Log out" button).

## Open Questions

### Resolved During Planning

- **Full REVOKE vs column-scoped GRANT on `feedback_forms`?** → Column-scoped. (D2)
- **Leave `join_motivation` / `referred_by` accessible via SECURITY DEFINER function?** → Pure server-side-only for this PR. (D3)
- **Uniformly generic API errors or `DomainError` class?** → `DomainError` class. (D4)
- **Keep `/logout` route or remove it?** → Keep the route as a POST-submitting fallback page; remove the GET `load` that currently signs out. (D8)

### Deferred to Implementation

- **Are any published prompts' `body_html` rendered via the TipTap fallback (Unit 1)?** Answering requires running the current renderer against the production corpus. If zero rely on it, delete cleanly. If any do, decide at that moment whether to (a) fix the underlying TipTap JSON/renderer bug for those specific prompts or (b) keep the fallback but escape. Plan assumes case (a); the implementer will confirm.
- **Does the `publish_prompt` RPC need to handle `cover_image_url` invariant (per review reliability finding on publish's pre-check race)?** Plan baseline is yes — move the cover-image check inside the RPC's transaction so it's atomic with the state transition. Implementer confirms the column is non-null and active at RPC-call time.
- **Where exactly does the logout button live in the UI today?** The plan lists `src/routes/(app)/+layout.svelte` (sidebar nav) and the `FloatingNav` component, but the implementer must grep for all `<a href="/logout">` and `goto('/logout')` call sites and migrate each.
- **What columns of `profiles` does the app actually need from the `authenticated` role?** Plan baseline: `id, username, display_name, avatar_url`. Implementer greps for `.from('profiles').select(` and confirms no caller needs additional columns from the authenticated role; any that do get a service-role helper or a new column to the allowlist.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Before: error and control flow today

```
/api/prompts/[id]/invitations/+server.ts
    |
    v
new SupabaseInvitationService(supabase).create({...})
    |
    |  (Supabase constraint violation)
    v
throw new Error('Failed to create invitation: duplicate key value violates ...')
    |
    v
catch (err) { return json({ error: (err as Error).message }, { status: 400 }) }
    |
    v
client sees: 'Failed to create invitation: duplicate key ...'   <-- schema leak
```

### After: with DomainError + handleServiceError

```
/api/prompts/[id]/invitations/+server.ts
    |
    v
new SupabaseInvitationService(supabase).create({...})
    |
    +-- user-safe case:      throw new DomainError('Cannot invite yourself')
    +-- supabase error case: throw new Error('Failed to create invitation: ...')
    |
    v
catch (err) { return handleServiceError(err, '[invitations]') }
    |
    |  handleServiceError:
    |     if err instanceof DomainError -> json({ error: err.message }, status=err.status ?? 400)
    |     else                          -> console.error('[invitations]', err);
    |                                      json({ error: 'Something went wrong' }, status=500)
    v
client sees: 'Cannot invite yourself' OR 'Something went wrong'   <-- safe either way
```

### Publish RPC atomicity

```
current (non-atomic):
  INSERT time_slots (x N) ---+
                             |
                             v
                    UPDATE prompts SET state='published'
                             |
                             v
                    if this fails, retry re-inserts slots

proposed (SECURITY DEFINER RPC):
  BEGIN;
    check cover_image_url NOT NULL;
    DELETE existing draft-state time_slots for this prompt;   -- idempotency safety net
    INSERT time_slots (x N);
    UPDATE prompts SET state='published';
  COMMIT;
```

### Accept-invitation idempotency

```
caller already accepted this invitation:
  SELECT state, invitee_id FROM prompt_invitations WHERE id = p_invitation_id;
  IF state = 'accepted' AND invitee_id = auth.uid()
    SELECT id FROM meetings WHERE invitation_id = p_invitation_id;
    RETURN meeting_id;   -- success, no re-processing
  END IF;

  ... existing pending-path logic ...
```

## Implementation Units

- [ ] **Unit 1: Delete TipTap body_html unescaped fallback**

**Goal:** Remove the unescaped string-interpolation fallback in `getPromptDetail` that feeds `{@html}` with potentially attacker-controlled text.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `src/lib/services/prompt-query.ts`
- Test: `src/lib/services/prompt-query.test.ts` (create if missing — this is the first service test file)

**Approach:**
- Delete the fallback that builds HTML from `jsonToPlainText(body).split(...).map(p => \`<p>${p}</p>\`).join('')`.
- If `renderTiptapToHtml` returns empty string, set `body_html` to empty string; the UI already handles empty body gracefully.
- Before deleting, grep production-like corpus (local dev DB if running, else verify via the unit test): ensure no published prompt currently depends on the fallback.

**Execution note:** Start with a failing test that feeds an adversarial TipTap JSON (one that makes `renderTiptapToHtml` throw) into `getPromptDetail` and asserts the resulting `body_html` does NOT contain raw `<` / `>` / `onerror`.

**Patterns to follow:**
- Test scaffolding at `src/lib/domain/time-slot.test.ts` for vitest + assertion style.
- Mocking Supabase at service level: use the existing test helpers in `tests/helpers/db.ts` if suitable, or inline mock the `.from().select()` chain.

**Test scenarios:**
- *Happy path:* well-formed TipTap JSON → `body_html` contains rendered HTML with entities properly escaped by TipTap.
- *Edge case:* empty TipTap JSON (`{type:'doc', content:[]}`) → `body_html` is empty string.
- *Error path:* TipTap JSON that passes `validateTiptapContent` but causes `renderTiptapToHtml` to return empty/throw → `body_html` is empty string, NOT the unescaped fallback.
- *Integration:* text node containing `<img src=x onerror=alert(1)>` inside a valid paragraph → rendered output escapes `<` and `>`; no raw `onerror` survives.

**Verification:**
- Test file imports and runs under `npx vitest run src/lib/services/prompt-query.test.ts`.
- All scenarios pass.
- Grep confirms no remaining `\`<p>${` in `src/lib/services/prompt-query.ts`.

---

- [ ] **Unit 2: Column-scoped UPDATE grants on `feedback_forms`**

**Goal:** Prevent a reviewer from directly PATCHing `state`, `locked_at`, `submitted_at`, or other protected columns; force all state transitions through the `submit_feedback` RPC.

**Requirements:** R2

**Dependencies:** None

**Files:**
- Create: `supabase/migrations/20260417_feedback_forms_column_grants.sql`

**Approach:**
- Migration: `REVOKE UPDATE ON feedback_forms FROM authenticated;` then `GRANT UPDATE (did_meet, no_show_reason, rating_tags, free_text, share_with_person, share_with_platform, platform_comments) ON feedback_forms TO authenticated;`.
- Keep the existing RLS policy `"Reviewer updates own form"` — the column grants are the second layer, RLS is the row-level layer.
- Document at the top of the migration that `submit_feedback` RPC remains the authoritative write path; direct UPDATEs are allowed only for legitimate content edits (supports a future draft-autosave feature).

**Patterns to follow:**
- Grant syntax in `supabase/migrations/20260412_restrict_profiles_anon_grant.sql` (anon-role example — adapt to authenticated).

**Test scenarios:**
- *Happy path (RPC still works):* submit_feedback RPC from an authenticated client still transitions state to `submitted` / `locked`. Verified by existing integration tests in `tests/integration/feedback-lifecycle.test.ts` continuing to pass after migration applies.
- *Error path (direct PATCH blocked on state):* authenticated client PATCHes `/rest/v1/feedback_forms?id=eq.<own>` with `{state: 'locked'}` → 403 or column-level permission denied. Add a direct test via admin client + anon JWT to `tests/integration/feedback-lifecycle.test.ts` or a new `feedback-grants.test.ts`.
- *Happy path (direct PATCH allowed on content column):* authenticated client PATCHes their own form with `{free_text: 'updated'}` before submission → succeeds. (This preserves the future draft-autosave option; note this is allowed by design.)
- *Error path (cross-user PATCH still blocked by RLS):* authenticated client PATCHes another user's form content column → RLS blocks (this is existing behaviour; regression test).

**Verification:**
- Migration applies cleanly on a fresh Supabase reset.
- Integration tests above pass.
- Querying `information_schema.column_privileges` for `feedback_forms` under `authenticated` shows UPDATE only on the content columns.

---

- [ ] **Unit 3: Server-side-only for sensitive `profiles` columns**

**Goal:** Remove `referred_by` and `join_motivation` from any read path available to the `authenticated` role; limit authenticated SELECT to `(id, username, display_name, avatar_url)`.

**Requirements:** R3

**Dependencies:** None

**Files:**
- Create: `supabase/migrations/20260417_profiles_authenticated_column_grants.sql`
- Modify (possibly): `src/lib/server/username-lookup.ts` and any other direct `.from('profiles').select` call sites IF they request revoked columns from an authenticated context.

**Approach:**
- Migration: `DROP POLICY "Public profiles are viewable by everyone" ON profiles;` then `CREATE POLICY "Authenticated reads non-sensitive profile fields" ON profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);`. Additionally `REVOKE SELECT ON profiles FROM authenticated; GRANT SELECT (id, username, display_name, avatar_url, berlin_based, onboarded, created_at) ON profiles TO authenticated;` — explicitly list only safe columns.
- Before writing the migration, **grep the codebase for `.from('profiles')` call sites** to confirm no authenticated read path depends on the revoked columns. `src/lib/server/username-lookup.ts` is one known path — verify it reads only allowed columns. Admin/ routes use service_role and are unaffected.
- If a call site depends on a revoked column, either move that read to service_role (if server-side) or add the column back to the grant list (documented).

**Execution note:** Characterization-first. Before migrating, write a test that authenticated user X cannot read `join_motivation` of user Y — it will initially pass (current behaviour allows it), invert the assertion, run, confirm it fails, then apply the migration and re-run to confirm it passes.

**Patterns to follow:**
- `supabase/migrations/20260412_restrict_profiles_anon_grant.sql` (same pattern, different role).
- `supabase/migrations/20260413_revoke_profiles_anon_entirely.sql` for revoke form.

**Test scenarios:**
- *Error path (sensitive columns blocked):* authenticated client `select('referred_by, join_motivation').from('profiles')` → column-level permission denied OR rows returned with those columns null.
- *Happy path (allowed columns work):* authenticated client `select('id, username, display_name, avatar_url').from('profiles')` → rows returned.
- *Happy path (service-role unaffected):* service-role admin panel still reads full profiles.
- *Error path (direct * select):* authenticated client `select('*')` → either fails or strips the revoked columns from the response, depending on PostgREST column-grant semantics. Document whichever Supabase returns.
- *Integration (app username lookup still works):* `username-lookup.ts` functional path still resolves username → id under authenticated session.

**Verification:**
- Migration applies on fresh reset.
- Test scenarios pass.
- Manual: sign in as test user, open devtools, paste a fetch to `/rest/v1/profiles?select=*&limit=5` with the session JWT → response either errors or has no `referred_by` / `join_motivation` values.

---

- [ ] **Unit 4: Convert logout to POST-only**

**Goal:** Prevent cross-origin triggers (image tags, prefetch, webmentions) from signing users out.

**Requirements:** R4

**Dependencies:** None

**Files:**
- Modify: `src/routes/logout/+page.server.ts` (convert `load` to a POST-form fallback page) OR delete and replace with a `+page.svelte` that renders an auto-submitting form.
- Modify: every UI call site that currently points the logout button at `/logout` (expected: `src/routes/(app)/+layout.svelte` sidebar and `src/lib/components/FloatingNav.svelte` — confirm via grep).
- Verify: `src/routes/(auth)/login/+page.server.ts` `logout` form action already exists and works.

**Approach:**
- Option A (minimal): delete the `load` signout in `src/routes/logout/+page.server.ts`, replace the route with a small page that renders a form POSTing to `?/logout` (on the login page action) with an auto-submit-on-mount script. Keeps any existing bookmarks/email links working.
- Option B (cleaner): delete `src/routes/logout` entirely, update every UI call site to submit a POST form directly.
- Prefer Option B; fall back to Option A only if grep reveals non-UI references (support emails, admin docs) that can't be quickly migrated.

**Patterns to follow:**
- `src/routes/(auth)/login/+page.server.ts` `logout` action.
- SvelteKit form actions — see other `actions` blocks in `+page.server.ts` files.

**Test scenarios:**
- *Error path (GET request no longer signs out):* `curl -X GET http://localhost:5173/logout -b 'session=<valid>'` → 405 Method Not Allowed or a page (not a sign-out side effect).
- *Happy path (POST from same-origin works):* clicking the sidebar logout button → user is signed out, redirected to `/`.
- *Error path (cross-origin POST blocked):* POST to `/logout` from a different origin → SvelteKit's CSRF protection rejects it (SvelteKit form actions are same-origin by default).
- *Integration (full flow):* sign in → click logout → confirm session cookie is cleared, redirect lands on `/` anonymous view.

**Verification:**
- Sidebar logout button still signs user out when clicked.
- `<img src="http://localhost:5173/logout">` embedded in a test HTML file opened from `file://` does NOT sign out the session.
- `grep -rn "href=\"/logout\"" src/` returns zero (or only same-origin POST forms).

---

- [ ] **Unit 5: Shared `handleServiceError` + `DomainError` class**

**Goal:** Stop leaking Supabase/Postgres error messages to API clients. Distinguish user-safe domain errors from internal errors.

**Requirements:** R5

**Dependencies:** None (must land before Units 6/7/8 so their services can use `DomainError`, but no hard dependency).

**Files:**
- Create: `src/lib/domain/errors.ts` — defines `DomainError` class.
- Create: `src/lib/server/handle-service-error.ts` — shared handler helper.
- Modify: the 14 API route handlers listed in the review — replace `catch (err) { return json({ error: (err as Error).message }, { status: 400 }) }` with `catch (err) { return handleServiceError(err, '[route-name]') }`.
- Gradually (not all in this unit): services throwing user-safe messages migrate to `throw new DomainError(msg, status?)`. For this PR, migrate only the two most tester-facing ones: `invitation.ts` ("Cannot invite yourself") and `comment.ts` ("Comment must be between 1 and 2000 characters"). Other services fall through the generic path without regression.
- Modify: `src/routes/(auth)/signup/+page.server.ts:117-123` (`signUpError.message` leak — map known patterns to friendly messages, genericize otherwise).

**Files list of API handlers (from review sec-4):**
- `src/routes/api/prompts/+server.ts`
- `src/routes/api/prompts/[id]/+server.ts`
- `src/routes/api/prompts/[id]/publish/+server.ts`
- `src/routes/api/prompts/[id]/republish/+server.ts`
- `src/routes/api/prompts/[id]/unpublish/+server.ts`
- `src/routes/api/prompts/[id]/slots/+server.ts`
- `src/routes/api/prompts/[id]/comments/+server.ts`
- `src/routes/api/prompts/[id]/invitations/+server.ts`
- `src/routes/api/invitations/[id]/+server.ts`
- `src/routes/api/invitations/[id]/accept/+server.ts`
- `src/routes/api/meetings/+server.ts`
- `src/routes/api/meetings/[id]/+server.ts`
- `src/routes/api/meetings/[id]/cancel/+server.ts`
- `src/routes/api/meetings/[id]/feedback/+server.ts`
- `src/routes/api/vocabulary/+server.ts`

Not every file exists — confirm via `ls` during implementation and skip non-existent paths.

**Approach:**
- `DomainError` extends `Error`, takes `(message: string, status = 400)`. Exported from `src/lib/domain/errors.ts`.
- `handleServiceError(err: unknown, scope: string): Response`:
  - `if (err instanceof DomainError) return json({ error: err.message }, { status: err.status });`
  - `console.error(\`${scope} unexpected error:\`, err);`
  - `return json({ error: 'Something went wrong' }, { status: 500 });`
- Call sites consolidate into a single three-line pattern.
- Test: unit test for `handleServiceError` covering both branches; integration test for at least one API route asserting a Supabase error is genericized and a DomainError message surfaces.

**Execution note:** Test-first. Write the unit test for the handler before implementing it. Then refactor one API route; verify the integration test passes; then fan out to the remaining 13.

**Patterns to follow:**
- `src/routes/api/contact/+server.ts:117-123` for the log-then-generic flow.
- SvelteKit `json()` from `@sveltejs/kit` for Response construction.

**Test scenarios:**
- *Unit: DomainError surfaces.* `handleServiceError(new DomainError('Cannot invite yourself'), '[t]')` → response status 400, body `{error: 'Cannot invite yourself'}`.
- *Unit: DomainError custom status.* `new DomainError('Forbidden', 403)` → status 403.
- *Unit: Generic Error genericized.* `handleServiceError(new Error('constraint violation ...'), '[t]')` → status 500, body `{error: 'Something went wrong'}`. `console.error` called with full message.
- *Unit: Unknown thrown value.* `handleServiceError('bare string', '[t]')` → status 500, `console.error` called.
- *Integration: invitation route with duplicate constraint.* Submit duplicate pending invitation → response is status 400 with a friendly message (after service migration) OR status 500 generic (before migration). Either way, NOT containing the constraint name.
- *Integration: invitation route with self-invite attempt.* Author invites themselves → response 400, body `{error: 'Cannot invite yourself'}` (requires invitation.ts migration in this unit).

**Verification:**
- Vitest unit run for `src/lib/server/handle-service-error.test.ts` passes all four unit scenarios.
- Grep confirms no remaining `(err as Error).message` in `src/routes/api/`.
- At least `src/lib/services/invitation.ts` and `src/lib/services/comment.ts` throw `DomainError` where they previously threw `Error` for user-safe cases. Other services untouched (safe under the generic fallback).

---

- [ ] **Unit 6: `publish_prompt` atomic RPC**

**Goal:** Make publishing transactional. Retry after any mid-publish failure does not duplicate slots.

**Requirements:** R6

**Dependencies:** None (safe to land in parallel with Units 1-5).

**Files:**
- Create: `supabase/migrations/20260417_publish_prompt_rpc.sql`
- Modify: `src/lib/services/prompt-command.ts` — replace the in-method `insert slots + update state` sequence with a single `supabase.rpc('publish_prompt', { ... })` call.
- Modify: `src/routes/api/prompts/[id]/publish/+server.ts` — remove the `cover_image_url` pre-check (now inside the RPC); handler now just calls the service and delegates errors to `handleServiceError`.
- Test: `tests/integration/prompt-lifecycle.test.ts` — add a publish-retry scenario.

**Approach:**
- RPC signature: `publish_prompt(p_prompt_id UUID, p_slots JSONB) RETURNS VOID`. JSONB array of `{start_time, duration_minutes, exact_location (jsonb)}` objects.
- RPC body:
  - `SELECT author_id, state, cover_image_url FROM prompts WHERE id = p_prompt_id FOR UPDATE;`
  - Reject if `author_id != auth.uid()`, state is not one of `'draft'` / `'archived'`, or `cover_image_url IS NULL`.
  - `DELETE FROM time_slots WHERE prompt_id = p_prompt_id AND accepted = FALSE;` — idempotency safety net: if a previous publish partially inserted slots, remove them before re-inserting.
  - Loop `p_slots` array, `INSERT INTO time_slots (...)` each (calling `derive_general_area` or equivalent per slot — note: we need to keep the Nominatim-derived `general_area` flow; the simplest path is to pre-derive in app code **before** calling the RPC, pass derived values in the JSONB, and let the RPC only handle DB operations).
  - `UPDATE prompts SET state = 'published', published_at = NOW() WHERE id = p_prompt_id;`
  - Commit implicitly at RPC return.
- App-layer flow in `prompt-command.ts.publish`:
  1. Validate input slots (existing logic).
  2. For each slot, `await deriveGeneralArea(exact_location)` (existing Nominatim call; now protected by Unit 8's timeout).
  3. Compose JSONB with derived fields.
  4. `await supabase.rpc('publish_prompt', {p_prompt_id, p_slots: jsonb});`
  5. Errors bubble up as Supabase error objects; the API handler delegates to `handleServiceError`.

**Execution note:** Characterization-first. Write an integration test that publishes a prompt, simulates a failure between slot insert and state update (e.g., by injecting a failing `update` via a test-only hook or by running the two statements with a raised exception in between), retries, and asserts slot count stays at N. Confirm failure on current code; apply RPC; re-run to assert pass.

**Patterns to follow:**
- RPC structure: `supabase/migrations/20260405_fix_accept_and_expiry.sql` (`accept_invitation`). Use `SECURITY DEFINER`, `SET search_path = public`, `auth.uid()` for actor, `REVOKE EXECUTE ... FROM public; GRANT EXECUTE ... TO authenticated` at the end.
- Idempotency pattern (delete-then-insert for drafts): simple and robust for this case.

**Test scenarios:**
- *Happy path:* fresh draft with 3 slots → publish → state='published', 3 time_slots rows attached, `published_at` populated.
- *Edge case (empty slots):* publish with empty JSONB → RPC raises `'At least one time slot is required'` (preserve existing app-layer check; can also guard in RPC).
- *Edge case (republish after publish):* already-published prompt → RPC raises `'Prompt not in publishable state'`. Re-publish path uses a different function (`republish_prompt`) out of scope for this unit.
- *Error path (no cover image):* `cover_image_url IS NULL` → RPC raises `'Cover image required'`.
- *Error path (not author):* caller !== author → RPC raises `'Not authorized'`. Unit tested via two authenticated clients in the integration test.
- *Integration / retry (idempotency):* publish → kill the response before client receives it → retry publish → slot count is still N, no duplicates. This is the scenario that motivates the whole unit.

**Verification:**
- Migration applies on fresh reset.
- `prompt-lifecycle.test.ts` publish + retry test passes.
- Grep confirms `prompt-command.ts.publish` no longer contains inline INSERT/UPDATE pair — only the RPC call and input prep.

---

- [ ] **Unit 7: Accept-invitation idempotency**

**Goal:** A user who retries `accept_invitation` receives the same success response twice, provided they are the rightful invitee.

**Requirements:** R7

**Dependencies:** None.

**Files:**
- Create: `supabase/migrations/20260417_accept_invitation_idempotent.sql`
- Modify: `src/routes/api/invitations/[id]/accept/+server.ts` — trust the RPC to return the existing meeting_id on retry; no client-side change needed.
- Test: `tests/integration/invitation-lifecycle.test.ts` — add an idempotency scenario.

**Approach:**
- Modify (via `CREATE OR REPLACE FUNCTION`) `accept_invitation`. Before the existing "Invitation not found or not pending" raise, add:
  ```
  SELECT state, invitee_id, slot_id INTO v_state, v_invitee_id, v_slot_id
  FROM prompt_invitations WHERE id = p_invitation_id;
  
  IF v_state = 'accepted' THEN
    IF v_invitee_id != auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
    SELECT id INTO v_meeting_id FROM meetings WHERE invitation_id = p_invitation_id;
    RETURN v_meeting_id;
  END IF;
  
  ... existing pending-path logic ...
  ```
- Preserves all other existing behaviour (slot already booked → cancel invitation and return NULL; slot start passed → expire and return NULL; non-invitee → Not authorized; happy path → book slot, create meeting, return meeting_id).
- This is a pure additive branch; existing invitation-lifecycle tests should continue to pass.

**Execution note:** Test-first. Write the retry integration test, confirm it fails on current RPC (second call raises 'Invitation not found or not pending'), apply migration, re-run.

**Patterns to follow:**
- `supabase/migrations/20260405_fix_accept_and_expiry.sql` — the function being replaced.

**Test scenarios:**
- *Happy path (first accept):* pending invitation → returns `meeting_id`; meeting exists; slot marked accepted. (Regression test for existing path.)
- *Idempotency (second accept by same invitee):* already-accepted invitation + caller is original invitee → returns the SAME `meeting_id`; no new meeting created. This is the new behaviour.
- *Error path (second accept by different user):* already-accepted invitation + caller is NOT the original invitee → raises `'Not authorized'`. This is the security guard preservation.
- *Edge case (slot already booked by another invitation):* pending invitation + competing invitation for same slot was accepted first → cancel this invitation, return NULL. (Existing path, regression.)
- *Edge case (slot start passed):* pending invitation + slot start has passed → expire invitation, return NULL. (Existing path, regression.)
- *Integration (via API):* `POST /api/invitations/[id]/accept` twice in quick succession → both responses 200 with same `meeting_id` in body. `meetings` table has exactly one row for this invitation.

**Verification:**
- Migration applies on fresh reset.
- `invitation-lifecycle.test.ts` idempotency scenario passes; all existing scenarios continue to pass.

---

- [ ] **Unit 8: Nominatim timeout with fallback**

**Goal:** Publish and slot-edit paths do not hang on slow Nominatim. Timeout falls through to "Berlin" generic area.

**Requirements:** R8

**Dependencies:** None. (If this lands before Unit 6, Unit 6's app-layer pre-derivation benefits. If after, also fine.)

**Files:**
- Modify: `src/lib/services/location.ts`

**Approach:**
- In `rateLimitedFetch` (or wherever the Nominatim `fetch` lives), wrap with `AbortController` and a 6-second timeout:
  - `const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 6000);`
  - `await fetch(url, { signal: controller.signal, ... });`
  - `clearTimeout(timeoutId);`
- Catch `AbortError` specifically: `console.error('[location] nominatim timeout, falling through to generic area')`.
- On timeout OR any `fetch` failure OR non-200 response: return the same fallback path currently triggered by `!res.ok` (generic "Berlin" area).
- Add a code comment near the module-scoped `lastRequestTime` noting: "Note: this rate-limit counter is per-CF-Workers-isolate and does not aggregate across isolates. For stricter rate-limiting, use Supabase or KV-backed counter."

**Patterns to follow:**
- Existing `!res.ok` fallback path in the same function.

**Test scenarios:**
- *Happy path:* Nominatim responds with coordinates in <6s → function returns derived `general_area`.
- *Edge case (slow Nominatim):* Nominatim doesn't respond for 6s → `AbortError` is caught → function returns "Berlin" generic area; `console.error` is called.
- *Error path (Nominatim 500):* Nominatim returns 500 → function returns "Berlin" generic area (existing path, regression).
- *Error path (network failure):* `fetch` throws (DNS/network) → function returns "Berlin" generic area; `console.error` is called.

**Verification:**
- Unit test (`src/lib/services/location.test.ts`, create new file if needed) covers the four scenarios by mocking `fetch`.
- Manual smoke: publish a prompt with dev server; publish completes within 10s even if Nominatim is slow (hard to trigger locally but observed behaviour in the timeout path).

---

## System-Wide Impact

- **Interaction graph:**
  - Unit 2 (feedback_forms grants) interacts with `submit_feedback` RPC — ensure RPC is unaffected (it runs as SECURITY DEFINER and bypasses column grants).
  - Unit 3 (profiles RLS) interacts with `src/lib/server/username-lookup.ts` and admin panel loaders; verify both before merging.
  - Unit 5 (handleServiceError) interacts with every API route — this is the broadest blast radius. Uniformly apply.
  - Unit 6 (publish RPC) interacts with Unit 8 (Nominatim timeout) — publish flow calls `deriveGeneralArea` before the RPC, so Unit 8's fallback determines behaviour under slow Nominatim.
  - Unit 7 (accept idempotency) interacts with `advance_scheduled_meetings` in `hooks.server.ts` — no direct change, but ensure the retry scenario doesn't trigger a race with meeting advancement.
- **Error propagation:**
  - Unit 5's `DomainError` surfaces user-safe messages; everything else genericizes. Pre-existing `error(401, ...)` (SvelteKit's `error()`) on auth failures in API routes should also be audited in this PR — migrate to JSON responses for consistency with the CLAUDE.md rule. This is called out in the review reliability findings as a P1, and while it's not in this PR's eight-fix scope, the handleServiceError helper creates the natural seam for it — flag as a follow-up if time runs out.
- **State lifecycle risks:**
  - Unit 6's `DELETE existing slots` before re-insert is safe for draft-state prompts (never accepted) but must NOT delete accepted slots. Guard with `accepted = FALSE`.
  - Unit 7's idempotency branch must not double-create meetings — the `meetings` lookup by `invitation_id` is the single source of truth for "is there already a meeting for this invitation?"
- **API surface parity:**
  - Unit 5 applies to EVERY API route uniformly; any new route added after this PR should default to `handleServiceError`. Add a note to `CLAUDE.md` API Endpoint Standards.
- **Integration coverage:**
  - Feedback-form grants (Unit 2) — direct PostgREST PATCH test is essential; unit-level mock tests cannot prove this.
  - Profiles RLS (Unit 3) — direct PostgREST SELECT test is essential.
  - Publish RPC retry (Unit 6) — retry scenario cannot be unit-tested; requires integration.
  - Accept idempotency (Unit 7) — same.
- **Unchanged invariants:**
  - The simultaneous-reveal invariant on feedback_forms (both parties submit before state='locked') is preserved — Unit 2 locks down the bypass but does not change the RPC.
  - The 12h cancellation cutoff stays on cancellations only, not acceptances (already established in migration 20260405).
  - All RLS policies on `prompts`, `prompt_comments`, `prompt_invitations`, `meetings`, `time_slots` are unchanged by this PR.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| A direct PostgREST call somewhere in the codebase reads `referred_by` or `join_motivation` under authenticated role — revoking grants breaks it silently. | Grep `.from('profiles').select(` in Unit 3 before writing migration. Add all legitimate reads to the grant list or move them to service_role. |
| `DomainError` migration touches 14 files; a missed file keeps leaking error messages. | Grep gate: after Unit 5, `rg '(err as Error).message' src/routes/api/` must return zero hits. |
| Publish RPC's `DELETE existing slots` could accidentally delete accepted slots for a prompt in an edge-case state (e.g., one slot got accepted, author tries to publish again from a stale draft state). | Guard is `accepted = FALSE`. Plus a test scenario: prompt with one accepted slot, attempt to publish → either RPC rejects (state not publishable) or deletes only non-accepted slots. Verify in tests. |
| Accept-invitation idempotency branch could return a stale meeting_id if the meeting was subsequently cancelled. | Acceptable — the meeting still exists in the DB, UI shows its cancelled state on `/meetings/[id]`. Retry doesn't "un-cancel" anything. |
| Nominatim timeout value (6s) is guess-work — too short may fail legitimate slow queries, too long blocks publish UX. | Default to 6s. Tune after production observability in PR D. Comment in code notes the value is tunable. |
| Shared `handleServiceError` changes the HTTP status code pattern. Some front-end code may have special-cased 400 vs 500. | Grep `res.status === 400` and `res.status === 500` in `src/routes/` and components. Verify each still makes sense. |
| Integration tests require remote Supabase creds per CLAUDE.md; implementer may not run them locally. | Document expected test commands and manual verification steps in PR description. Run full integration suite at least once against local Supabase before merging. |

## Documentation / Operational Notes

- Update `CLAUDE.md` → API Endpoint Standards section: reference `handleServiceError` as the canonical pattern for API catch blocks.
- Add a brief line to `CLAUDE.md` → Security Boundaries: "Sensitive profile columns (`referred_by`, `join_motivation`) are service-role-only; do not read them from authenticated clients."
- No rollout/monitoring plan in this PR — PR D (observability) will add the events table.
- Migration sequence: four new migrations land in this PR (20260417 × 4). Order doesn't matter since they're independent; apply as Supabase receives them.

## Sources & References

- **Origin document:** in-conversation test-readiness review, 2026-04-16 (summarized in PR description).
- Patterns followed:
  - `supabase/migrations/20260405_fix_accept_and_expiry.sql` — RPC shape.
  - `supabase/migrations/20260412_restrict_profiles_anon_grant.sql` — column grant pattern.
  - `src/routes/api/contact/+server.ts:117-123` — log-then-generic error handling.
  - `src/routes/(auth)/login/+page.server.ts` — POST form action pattern.
- Related issues: todo 019 (logout CSRF); review findings sec-1, sec-2, sec-3, sec-4, sec-5, reliability findings publish/accept/Nominatim.
- Superseded / affected open PRs:
  - PR #106 (PostHog removal + landing preview) — must merge first; this plan is against `main` post-#106.
