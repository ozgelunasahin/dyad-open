---
title: "fix: v0.1 Session 4a — Feedback Reveal"
type: fix
status: active
date: 2026-03-28
origin: docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md
deepened: 2026-03-28
---

# v0.1 Session 4a: Feedback Reveal

The core promise — simultaneous reveal. Backend is complete (`getRevealedFeedback`, `GET /api/meetings/[id]/feedback`, `submit_feedback` RPC with atomic lock). This session builds the frontend.

**Scope:** Items 1-3 only (feedback page + meeting detail reveal). Other items moved out:
- Item 4 (sidebar link) → UI polish pass
- Item 5 (E2E test) → consolidated into test harness plan (`2026-03-28-feat-v01-test-harness-plan.md`)
- Item 6 (security hardening) → standalone security review PR

(see brainstorm: `docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md` — Session 4)

## Enhancement Summary

**Deepened on:** 2026-03-28
**Review agents used:** svelte-web-dev skill, julik-frontend-races-reviewer, security-sentinel, architecture-strategist, code-simplicity-reviewer, pattern-recognition-specialist, kieran-typescript-reviewer, performance-oracle, learnings-researcher (7 solution docs)

### Key Improvements from Review
1. **PATCH endpoint returns revealed feedback directly** — eliminates a client round trip, simplifies client code, closes a UI flash gap (consensus: simplicity, performance, architecture)
2. **Hydration skew race identified and mitigated** — form can transition `submitted→locked` between server load and client hydration; catch-up check on `waiting` step (frontend races reviewer)
3. **Security hardening** — sanitize error responses, harden RLS UPDATE policy, verify gate exempt paths (security sentinel)
4. **Scope reduction** — RevealCard extraction deferred (inline in 2 places), defensive fallback removal deferred, `released` state handled with a single `||` not a plan item (simplicity reviewer)

### New Considerations Discovered
- `/api/meetings/[id]/feedback` is NOT in the feedback gate exempt list — could cause 403 if user has another `due` form (learnings: feedback-gate-middleware-pattern)
- `free_text` column is readable by reviewee via direct Supabase query — RLS column grant is too broad (security sentinel)
- Existing E2E tests use `try/finally` for cleanup, not `afterAll` — plan had a factual error (pattern recognition)

## Dependencies

- **Session 1 (merged PR #63):** Migrations applied, column names fixed, security SQL shipped.
- **Sessions 2-3 (not yet planned):** Independent. Session 4 can run in parallel with Session 3 (see brainstorm: "Sessions 3 and 4 can interleave"). Session 2 (admin panel + app feedback) is not a dependency for this work.
- **`advance_scheduled_meetings()` must be callable:** Either pg_cron is enabled (Session 1 item 8) or the function can be invoked manually via admin client for testing.

## Items

### 1. Feedback page — fix step initialization + server-side reveal loading

The feedback page (`src/routes/(app)/feedback/[id]/+page.svelte:7`) initializes `step` based only on `submitted` vs everything else. A `locked` form falls through to `'met'`, re-showing the entry form for an already-submitted form.

**Fix in `src/routes/(app)/feedback/[id]/+page.server.ts`:**
- When `form.state === 'locked'` (or `'released'`): load revealed feedback via `feedbackService.getRevealedFeedback(form.meeting_id, userId)` and return alongside form data.
- When `form.state === 'not_due'`: redirect to `/meetings/${form.meeting_id}` (not `/discover` — user has meeting context). Use `redirect(302, ...)`.
- Always return `revealedFeedback: RevealedFeedback[]` (empty array as default, never `undefined`) to keep the type clean downstream.

**Fix in `src/routes/(app)/feedback/[id]/+page.svelte`:**

Define a named type and explicit state mapping:

```typescript
type FeedbackStep = 'met' | 'rating' | 'waiting' | 'reveal';

function initialStep(state: FeedbackFormState): FeedbackStep {
  if (state === 'locked' || state === 'released') return 'reveal';
  if (state === 'submitted') return 'waiting';
  return 'met'; // 'due' — 'not_due' handled by server redirect
}
```

Use 4 steps, not 3. `waiting` and `reveal` are distinct UX states — do not overload `done` for both (Svelte reviewer). Check `locked` before `submitted` in the mapping (TypeScript reviewer).

#### Research Insights

**Svelte 5 pattern:** Consider `$derived` for the base step (from server data) with `$state` override for user-driven transitions. This handles `invalidateAll()` gracefully:
```typescript
let userStep = $state<FeedbackStep | null>(null);
let effectiveStep = $derived(userStep ?? initialStep(data.form.state));
```
After submission, reset `userStep = null` to let server state drive again.

**Race condition — hydration skew (frontend races reviewer, HIGH priority):**
If the form transitions `submitted→locked` between server load and client hydration, the user sees `waiting` but feedback is actually revealed. Mitigation: on mount when `effectiveStep === 'waiting'`, do a single catch-up check — fetch the form state from `/api/feedback/${data.form.id}` (GET endpoint already exists). If it returns `locked`, transition to `reveal`. This is one request, not polling.

**Double-click guard:** Add `if (submitting) return;` at the top of `handleSubmit` as belt-and-suspenders alongside the `disabled={submitting}` attribute.

**Svelte 5 migration note:** If touching the file, migrate `$app/stores` → `$app/state` imports.

### 2. Feedback page — inline reveal after submission triggers lock

When the user submits and the PATCH response returns `state: 'locked'` (both parties submitted, atomic lock triggered):

**Fix in `src/routes/api/feedback/[id]/+server.ts` (PATCH handler):**
- After `service.submit()` returns, check if `newState === 'locked'`.
- If locked: fetch revealed feedback via `service.getRevealedFeedback(form.meeting_id, userId)` and include in response: `{ ok: true, state: 'locked', revealed: [...] }`.
- If submitted: return `{ ok: true, state: 'submitted' }` (no extra query).

This eliminates the second client round trip entirely. The client reads revealed data directly from the PATCH response. **Consensus from simplicity, performance, and architecture reviewers.**

**Fix in `src/routes/(app)/feedback/[id]/+page.svelte` (`handleSubmit`):**
- Read `state` from response body (currently ignored — races reviewer).
- If `state === 'locked'`: populate `revealedFeedback` from `response.revealed`, set `userStep = null` (let `$derived` resolve to `'reveal'`).
- If `state === 'submitted'`: set `userStep = null` (resolves to `'waiting'`).

**Do NOT use `$effect` for data fetching** — keep the fetch explicit in `handleSubmit`'s success path (Svelte reviewer anti-pattern).

#### Research Insights

**AbortController for unmount safety (frontend races reviewer):** If adding any async work after the PATCH, track a `mounted` flag or use an `AbortController` wired to `onDestroy`. Prevents writing to `$state` on a destroyed component.

**Gate exempt path concern (learnings: feedback-gate-middleware-pattern):** The GET endpoint `/api/meetings/[id]/feedback` is NOT in the feedback gate exempt list. However, since we're returning revealed data in the PATCH response instead, this concern is eliminated for the feedback page flow. The meeting detail page loads server-side (not an API call), so the gate is also not an issue there. Only flag: if a user has TWO `due` forms from different meetings, verify the gate only blocks on the first one.

### 3. Meeting detail page — revealed feedback section + status for `awaiting_feedback`

The meeting detail page (`src/routes/(app)/meetings/[id]/`) has no awareness of `completed` or `awaiting_feedback` states.

**Fix in `src/routes/(app)/meetings/[id]/+page.server.ts`:**
- Import and instantiate `SupabaseFeedbackService` (use service layer, not raw queries — architecture reviewer).
- When `meeting.state === 'completed'`: call `feedbackService.getRevealedFeedback(meetingId, userId)`. Add to existing `Promise.all` to avoid waterfall.
- When `meeting.state === 'awaiting_feedback'`: call `feedbackService.getMyForm(meetingId, userId)` to determine sub-state (form `due` vs `submitted`). Return the form ID for linking.
- Always return `revealedFeedback: RevealedFeedback[]` (empty array default) and `myFeedbackForm: { id: string; state: FeedbackFormState } | null`.

**Fix in `src/routes/(app)/meetings/[id]/+page.svelte`:**
- Add `{#if data.revealedFeedback.length}` block (check data, not state — Svelte reviewer):
  - Section header: "What they shared with you"
  - `share_with_person` text in a `<blockquote>` (semantic markup — Svelte reviewer)
  - `rating_tags` as tag pills in `<ul role="list">` with `<li>` items (accessibility — Svelte reviewer)
  - If `did_meet === false`: distinct presentation ("They reported you didn't meet")
- Add `{#if data.meeting.state === 'awaiting_feedback'}` block (architecture reviewer):
  - If `myFeedbackForm.state === 'due'`: "You have feedback to submit" + link to `/feedback/${myFeedbackForm.id}`
  - If `myFeedbackForm.state === 'submitted'`: "Feedback submitted — waiting for the other person"

**Inline the reveal markup** in both this page and the feedback page rather than extracting a shared `RevealCard.svelte`. The markup is ~15-20 lines. Two identical blocks is simpler than a premature abstraction — extract later if a third use appears (simplicity reviewer).

#### Research Insights

**Parallel query pattern:** Use two-phase loading — load meeting first (need state), then fan out all remaining queries in `Promise.all`:
```typescript
const meeting = await meetingService.getWithLocation(meetingId, userId);
const [profile, prompt, invitation, revealedFeedback, myForm] = await Promise.all([
  /* existing queries... */
  meeting.state === 'completed' ? feedbackService.getRevealedFeedback(meetingId, userId) : [],
  meeting.state === 'awaiting_feedback' ? feedbackService.getMyForm(meetingId, userId) : null,
]);
```

**Security — error response sanitization (security sentinel, HIGH):** The GET endpoint at `/api/meetings/[id]/feedback` returns raw `err.message` on error, which could leak table/column names. Return a generic error message instead. Apply the same fix to the PATCH endpoint at `/api/feedback/[id]`.

### 4. S6: New conversation button visible on all viewports

The `+` button only exists in FloatingNav (mobile, `<430px`). Desktop sidebar (`src/routes/(app)/+layout.svelte`) has no "new conversation" link.

**Fix in `src/routes/(app)/+layout.svelte`:**
- Add "New conversation" as an `<a href="/conversations/new">` link in `sidebar-nav` (between Discover and Profile). Use `<a>` tag, not `onclick+goto()` — SvelteKit convention for progressive enhancement (Svelte reviewer).
- Add `class:active={currentPath === '/conversations/new'}` for active state (pattern recognition).
- Style consistent with existing nav links using design tokens.

**Note:** Check `origin/feat/v0.1-design-work` and `origin/feat/v0.1-design-profile` for any design-branch decisions about sidebar layout before implementing (see feedback memory: always check design branches before UI changes).

### 5. E2E test — feedback gate, submission, lock, and reveal

Extend Playwright tests to cover the full feedback flow. Auth setup for `sophie@dyad.berlin` and `tom@dyad.berlin` already exists.

**New test in `tests/e2e/feedback-flow.test.ts`:**

1. **Setup:** Use admin client to create a meeting between Sophie and Tom with `scheduled_time` in the past. Call `advance_scheduled_meetings()` via admin RPC to transition to `awaiting_feedback` and create feedback forms.
2. **Gate redirect:** As Sophie, navigate to `/discover` → verify redirect to `/feedback/[formId]`.
3. **Submit (first party):** Sophie fills out and submits feedback → verify "waiting" message visible, reveal NOT visible (state `submitted`).
4. **Gate release:** Sophie can now navigate freely (form is no longer `due`).
5. **Submit (second party):** As Tom, navigate → gate redirect → submit feedback → verify inline reveal visible with Sophie's `share_with_person` text and rating tags (state `locked`).
6. **Meeting detail reveal:** As Tom, navigate to `/meetings/[id]` → verify revealed feedback section visible.
7. **Revisit locked form:** As Sophie, navigate to `/feedback/[formId]` → verify immediate reveal (no form re-shown).
8. **Cleanup in `finally` block:** Delete `feedback_forms` BEFORE `meetings` (FK constraint), then meetings, invitations, comments, slots, prompts. Delete by specific IDs, not blanket deletes (learnings: service-layer patterns).

**Corrections from review:**
- Use `try/finally` for cleanup (not `afterAll` — existing pattern in `core-flow.test.ts`, factual error in original plan).
- This should be a single `test()` block (sequential dependency between steps), matching `core-flow.test.ts` structure.
- Calling `advance_scheduled_meetings()` via RPC is a new pattern for the test suite but architecturally sound given the state machine complexity.

**Update `tests/e2e/core-flow.test.ts`:** Add `feedback_forms` deletion to the existing `finally` block (currently missing — FK would fail if feedback forms exist from other tests).

### 6. Security hardening (new — from security review)

Items identified by the security sentinel that should ship with this session:

**6a. Sanitize error responses (HIGH):**
- `src/routes/api/meetings/[id]/feedback/+server.ts`: Replace `json({ error: (err as Error).message })` with a generic error message.
- `src/routes/api/feedback/[id]/+server.ts`: Same — map known RPC exceptions to user-friendly messages, generic fallback for unexpected errors.

**6b. Harden RLS UPDATE policy on feedback_forms (MEDIUM):**
- The current "Reviewer updates own form" RLS policy allows UPDATE when `reviewer_id = auth.uid()` with no state restriction. A technically sophisticated user could UPDATE a `locked` form via direct Supabase client query (anon key is public).
- Fix: Add `AND state IN ('due', 'submitted')` to the UPDATE policy. This is defense-in-depth — the RPC already enforces this, but the direct-client path should be closed.
- **Requires a new migration** — `supabase/migrations/20260407_harden_feedback_update_policy.sql` or similar.

**6c. `not_due` redirect (MEDIUM):**
- Already covered in Item 1, but flagged as security-relevant: a bookmarked `not_due` form URL shows the form UI and meeting context prematurely. The server redirect prevents this.

## Acceptance Criteria

- [ ] Feedback page shows distinct "waiting" message for `submitted` state
- [ ] Feedback page shows inline reveal when PATCH returns `state: 'locked'` (with revealed data in response)
- [ ] Feedback page shows immediate reveal when loaded with `state === 'locked'`
- [ ] Feedback page redirects to meeting detail for `not_due` forms
- [ ] Catch-up check on `waiting` step detects post-hydration lock
- [ ] Meeting detail page shows revealed feedback section for `completed` meetings
- [ ] Meeting detail page shows feedback status + link for `awaiting_feedback` state
- [ ] `released` state does not break UI (handled by `||` in step initialization)
- [ ] No new `svelte-check` errors

### Out of scope (moved to other tracks)
- E2E test → test harness plan
- Error response sanitization → security hardening PR
- RLS UPDATE policy hardening → security hardening PR
- Sidebar "New conversation" link → UI polish pass

## Scope Reduction (from simplicity review)

These items from the original plan were **removed** after review:

| Original Item | Verdict | Rationale |
|---------------|---------|-----------|
| RevealCard.svelte extraction | Deferred | Premature abstraction for 2 uses. Inline ~15 lines in both places. Extract when a 3rd use appears. |
| Remove defensive fallbacks (`?? 'TBD'` etc.) | Deferred | Harmless for alpha, masks data bugs that are useful to surface. TypeScript reviewer agrees: keep `?? 'someone'` to guarantee `string` type downstream. |
| `released` state as separate plan item | Absorbed | One `||` condition in the step mapping function. Not worth a plan item. |
| Client-side GET after PATCH | Eliminated | PATCH returns revealed data directly. No second round trip needed. |

## Technical Approach

**Files to modify:**
1. `src/routes/(app)/feedback/[id]/+page.server.ts` — load revealed feedback for locked forms, `not_due` redirect, always return `revealedFeedback: []`
2. `src/routes/(app)/feedback/[id]/+page.svelte` — 4-step state machine, inline reveal markup, catch-up check, double-click guard
3. `src/routes/(app)/meetings/[id]/+page.server.ts` — load revealed feedback + own form state, SupabaseFeedbackService import
4. `src/routes/(app)/meetings/[id]/+page.svelte` — reveal section, awaiting_feedback status, accessible markup
5. `src/routes/(app)/+layout.svelte` — add new conversation link to sidebar
6. `src/routes/api/feedback/[id]/+server.ts` — return revealed data in PATCH response when locked, sanitize errors
7. `src/routes/api/meetings/[id]/feedback/+server.ts` — sanitize error responses

**Files to create:**
1. `tests/e2e/feedback-flow.test.ts` — E2E feedback test
2. `supabase/migrations/20260407_harden_feedback_update_policy.sql` — RLS UPDATE policy hardening

**Existing backend used (no changes needed):**
- `src/lib/services/feedback.ts` — `getRevealedFeedback()`, `getFormById()`, `getMyForm()`, `submit()`
- `submit_feedback` RPC — atomic lock when both submit (`FOR UPDATE` prevents race)
- RLS policy: reviewee reads locked forms only

**Key patterns to follow:**
- Server-side data loading for initial render (no `$effect` or `onMount` fetching)
- `Promise.all` for parallel queries in loaders (two-phase: load primary entity, then fan out)
- Always return arrays, never `undefined` (clean types downstream)
- Service layer for all DB access (don't add raw Supabase queries)
- `try/finally` for E2E test cleanup
- `<a href>` for navigation links (progressive enhancement)
- `<ul role="list">` for tag pill lists (accessibility)
- Migrate `$app/stores` → `$app/state` in touched files

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Both submit within seconds (race) | `submit_feedback` RPC uses `FOR UPDATE` lock — exactly one triggers the lock, no double-lock. Client must handle BOTH `submitted` and `locked` as first-class responses. |
| Hydration skew (submitted→locked during page load) | Catch-up fetch on `waiting` step mount detects the transition |
| User navigates away mid-PATCH | AbortController in `onDestroy` cancels in-flight requests |
| Double-click on submit | `if (submitting) return` guard + `disabled` attribute |
| User revisits locked form via bookmark | Server detects `locked`, loads reveal, shows immediately |
| User visits meeting detail before submitting feedback | Gate redirects to feedback form first |
| User visits meeting detail after submitting but before other party | Shows "Feedback submitted — waiting for the other person" with form state from `getMyForm` |
| Form in `not_due` state accessed directly | Server redirects to `/meetings/${form.meeting_id}` |
| Form in `released` state | Treated as `locked` via `||` in step initialization |
| PATCH returns `locked` but revealed data is empty | Should not happen (atomic transaction), but if it does: show "waiting" as fallback, retry once |
| User has TWO `due` forms | Gate blocks on first; second form accessible after first submitted. Verify gate queries `LIMIT 1 ORDER BY created_at`. |
| `general_area` is null on meeting page | Keep existing `?? 'TBD'` fallback (nullable in DB, may be genuine null) |
| `otherUsername` is null | Keep existing `?? 'someone'` fallback (guarantees `string` type downstream) |
| Error response from API endpoints | Return generic messages, not raw Postgres errors |

## Security Considerations

From security sentinel review (5 findings):

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Error message leak on GET/PATCH endpoints | HIGH | **Item 6a** — sanitize before shipping |
| 2 | Missing `not_due` redirect guard | MEDIUM | **Item 1** — redirect in server loader |
| 3 | RLS UPDATE policy too permissive (no state check) | MEDIUM | **Item 6b** — new migration |
| 4 | `free_text` readable by reviewee via column grant | LOW | Accepted risk for alpha — service layer doesn't expose it. Harden in v0.2. |
| 5 | Post-reveal tampering via direct Supabase UPDATE | MEDIUM | **Item 6b** — closed by state restriction on UPDATE policy |

**RLS note for future:** If `released` state is later implemented, the reviewee SELECT policy must be updated to include `state IN ('locked', 'released')` or reviewee loses read access (learnings: rls-two-party-visibility-pattern).

**"Waiting" copy must not reveal other party's submission status** — the reviewee cannot see whether a form EXISTS before it's locked. "You'll see what they shared once they submit theirs" is correct because it doesn't confirm or deny the other party's status (learnings: rls-two-party-visibility-pattern).

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md](docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md) — Session 4: "The core promise — simultaneous reveal — and remaining items."
- **Release readiness plan:** [docs/plans/2026-03-28-feat-v01-release-readiness-plan.md](docs/plans/2026-03-28-feat-v01-release-readiness-plan.md) — B6 (revealed feedback UI), S6 (new conversation button)
- **Session 1 plan:** [docs/plans/2026-03-28-fix-v01-session1-infrastructure-db-plan.md](docs/plans/2026-03-28-fix-v01-session1-infrastructure-db-plan.md) — completed items referenced
- **Solution docs:** `docs/solutions/architecture/rpc-cascading-side-effects.md` (simultaneous lock pattern — `FOR UPDATE`, one submitter sees `locked`), `docs/solutions/architecture/feedback-gate-middleware-pattern.md` (gate exempt paths, fail-open, dual response format), `docs/solutions/security-issues/rls-two-party-visibility-pattern.md` (reviewee reads locked forms only, timing side-channel safe), `docs/solutions/architecture/service-layer-and-test-portability-patterns.md` (service instantiation, `maybeSingle()` pattern)
- **Existing backend:** `src/lib/services/feedback.ts`, `src/routes/api/meetings/[id]/feedback/+server.ts`, `src/routes/api/feedback/[id]/+server.ts`

### Review Agents

9 parallel review agents contributed to this deepened plan:

| Agent | Key Contribution |
|-------|-----------------|
| **svelte-web-dev skill** | 4-step state machine, `$derived` base step pattern, `$app/state` migration, accessible markup, no `$effect` for fetching |
| **julik-frontend-races** | Hydration skew race (catch-up fetch), AbortController for unmount, double-click guard, gate race on `/api/meetings` path |
| **security-sentinel** | 5 findings: error message leak (HIGH), `not_due` guard, RLS UPDATE hardening, `free_text` column grant, post-reveal tampering |
| **architecture-strategist** | Load own form state for `awaiting_feedback`, `not_due` → meeting redirect, `Promise.all` parallel queries, service layer consistency |
| **code-simplicity** | Scope cuts: no RevealCard extraction, no fallback removal, no `released` item. PATCH returns revealed data directly. |
| **pattern-recognition** | `try/finally` correction, `class:active` on sidebar link, `shareWithPerson: string|null` prop type, single `test()` block |
| **kieran-typescript** | Always return `[]` not `undefined`, named `FeedbackStep` type, keep `?? 'someone'` for type safety, `Props` interface pattern |
| **performance-oracle** | PATCH returning revealed data (key win), `Promise.all` for parallel queries, no optimization needed at alpha scale |
| **learnings-researcher** | Gate exempt path gap, RLS policy note for `released`, copy must not reveal other party's status, `maybeSingle()` pattern |
