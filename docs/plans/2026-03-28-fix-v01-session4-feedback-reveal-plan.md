---
title: "fix: v0.1 Session 4 — Feedback Reveal + Final Polish"
type: fix
status: active
date: 2026-03-28
origin: docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md
---

# v0.1 Session 4: Feedback Reveal + Final Polish

The core promise — simultaneous reveal — and remaining polish items. Backend is complete (`getRevealedFeedback`, `GET /api/meetings/[id]/feedback`, `submit_feedback` RPC with atomic lock). This session builds the frontend.

(see brainstorm: `docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md` — Session 4)

## Dependencies

- **Session 1 (merged PR #63):** Migrations applied, column names fixed, security SQL shipped.
- **Sessions 2-3 (not yet planned):** Independent. Session 4 can run in parallel with Session 3 (see brainstorm: "Sessions 3 and 4 can interleave"). Session 2 (admin panel + app feedback) is not a dependency for this work.
- **`advance_scheduled_meetings()` must be callable:** Either pg_cron is enabled (Session 1 item 8) or the function can be invoked manually via admin client for testing.

## Items

### 1. Feedback page — fix step initialization for `locked` and `submitted` states

The feedback page (`src/routes/(app)/feedback/[id]/+page.svelte:7`) initializes `step` based only on `submitted` vs everything else. A `locked` form falls through to `'met'`, re-showing the entry form for an already-submitted form.

**Fix in `src/routes/(app)/feedback/[id]/+page.svelte`:**
- `locked` → show reveal immediately (new `'reveal'` step)
- `submitted` → show "waiting" message (distinct from reveal)
- `due` → show form (current `'met'` step)
- `not_due` → redirect to `/discover` (guard against premature access)

**Fix in `src/routes/(app)/feedback/[id]/+page.server.ts`:**
- When `form.state === 'locked'`: load revealed feedback via `feedbackService.getRevealedFeedback(form.meeting_id, userId)` and return it alongside the form data.

### 2. Feedback page — inline reveal after submission triggers lock

When the user submits and the PATCH response returns `state: 'locked'` (both parties submitted, atomic lock triggered):

**Fix in `src/routes/(app)/feedback/[id]/+page.svelte` (`handleSubmit`):**
- Inspect response body for `state === 'locked'`
- Fetch revealed feedback from `GET /api/meetings/${data.form.meeting_id}/feedback`
- Set `step = 'reveal'` and display the other person's feedback inline
- If `state === 'submitted'` (first party): set `step = 'done'`, show "Your feedback has been submitted. You'll see what they shared once they submit theirs."

### 3. Meeting detail page — revealed feedback section for `completed` state

The meeting detail page (`src/routes/(app)/meetings/[id]/`) has no awareness of `completed` or `awaiting_feedback` states.

**Fix in `src/routes/(app)/meetings/[id]/+page.server.ts`:**
- When `meeting.state === 'completed'`: call `feedbackService.getRevealedFeedback(meetingId, userId)` and return it.
- Need to instantiate `SupabaseFeedbackService` (currently not imported in this file).

**Fix in `src/routes/(app)/meetings/[id]/+page.svelte`:**
- Add `{#if data.meeting.state === 'completed' && data.revealedFeedback?.length}` block showing:
  - Section header: "What they shared with you" (or similar — copy to be reviewed)
  - `share_with_person` text
  - `rating_tags` as tag pills (reuse adjective vocabulary display from feedback form)
  - If `did_meet === false`: distinct presentation ("They reported you didn't meet" + `share_with_person` as context)
- Add `{#if data.meeting.state === 'awaiting_feedback'}` block showing status: "Awaiting feedback" with a link to the feedback form if the user hasn't submitted yet.

### 4. Extract shared `RevealCard.svelte` component

The reveal UI appears in two places (feedback page inline reveal + meeting detail page). Extract a shared component.

**Create `src/lib/components/RevealCard.svelte`:**
- Props: `otherUsername: string`, `shareWithPerson: string`, `ratingTags: string[]`, `didMeet: boolean`
- Renders: username attribution, share_with_person text, rating tag pills
- Handles `didMeet === false` variant (no rating tags, different framing)
- Uses existing design tokens (`--space-*`, `--text-*`, `--radius-*`)

### 5. Remove defensive fallbacks — show actual nulls

Per the "no defensive fallbacks during alpha" principle (see brainstorm: decision from readiness plan).

| File | Line | Current | Replacement |
|------|------|---------|-------------|
| `src/routes/(app)/meetings/[id]/+page.svelte` | 50 | `general_area ?? 'TBD'` | Conditionally hide the area row when null |
| `src/routes/(app)/meetings/[id]/+page.server.ts` | 41 | `otherUsername ?? 'someone'` | Pass `null`, let UI conditionally render |
| `src/routes/(app)/feedback/[id]/+page.server.ts` | 33 | `otherUsername ?? 'someone'` | Pass `null`, let UI conditionally render |
| `src/routes/(app)/feedback/[id]/+page.server.ts` | 34 | `promptTitle ?? 'a conversation'` | Pass `null`, let UI conditionally render |

**Approach:** Conditionally hide or show an em dash for null values (consistent with how `exact_location` is already conditionally shown on the meeting page). Do NOT render the literal string "null".

### 6. S6: New conversation button visible on all viewports

The `+` button only exists in FloatingNav (mobile, `<430px`). Desktop sidebar (`src/routes/(app)/+layout.svelte`) has no "new conversation" link.

**Fix in `src/routes/(app)/+layout.svelte`:**
- Add "New conversation" link in the sidebar nav list (between existing Discover/Profile links), pointing to `/conversations/new`.
- Style consistent with existing nav links.

**Note:** Check `origin/feat/v0.1-design-work` and `origin/feat/v0.1-design-profile` for any design-branch decisions about sidebar layout before implementing (see feedback memory: always check design branches before UI changes).

### 7. E2E test — feedback gate, submission, lock, and reveal

Extend Playwright tests to cover the full feedback flow. Auth setup for `sophie@dyad.berlin` and `tom@dyad.berlin` already exists.

**New test in `tests/e2e/feedback-flow.test.ts`:**

1. **Setup:** Use admin client to create a meeting between Sophie and Tom with `scheduled_time` in the past. Call `advance_scheduled_meetings()` via admin RPC to transition to `awaiting_feedback` and create feedback forms.
2. **Gate redirect:** As Sophie, navigate to `/discover` → verify redirect to `/feedback/[formId]`.
3. **Submit (first party):** Sophie fills out and submits feedback → verify "waiting" message (state `submitted`).
4. **Gate release:** Sophie can now navigate freely (form is no longer `due`).
5. **Submit (second party):** As Tom, navigate → gate redirect → submit feedback → verify inline reveal (state `locked`).
6. **Meeting detail reveal:** As Tom, navigate to `/meetings/[id]` → verify revealed feedback section visible.
7. **Revisit locked form:** As Sophie, navigate to `/feedback/[formId]` → verify immediate reveal (no form re-shown).
8. **Cleanup:** Delete `feedback_forms` BEFORE `meetings` (FK constraint), then meetings, invitations, comments, slots, prompts.

**Update `tests/e2e/core-flow.test.ts` cleanup:** Add `feedback_forms` deletion to the existing `afterAll` block (currently missing — FK would fail if feedback forms exist).

### 8. Handle `released` state gracefully

`FeedbackFormState` includes `'released'` but no migration transitions to it yet. Treat `released` the same as `locked` for display purposes so the UI doesn't break when this is later implemented.

- Feedback page: `'locked' | 'released'` → show reveal
- Meeting detail: check `state === 'completed'` (which implies locked/released forms)

## Acceptance Criteria

- [ ] Feedback page shows distinct "waiting" message for `submitted` state
- [ ] Feedback page shows inline reveal when PATCH returns `state: 'locked'`
- [ ] Feedback page shows immediate reveal when loaded with `state === 'locked'`
- [ ] Feedback page redirects to `/discover` for `not_due` forms
- [ ] Meeting detail page shows revealed feedback section for `completed` meetings
- [ ] Meeting detail page shows "Awaiting feedback" status with link for `awaiting_feedback` state
- [ ] `RevealCard` handles `did_meet === false` variant
- [ ] No `?? 'TBD'`, `?? 'someone'`, or `?? 'a conversation'` fallbacks remain
- [ ] Null values are conditionally hidden (not rendered as literal "null")
- [ ] "New conversation" link visible on desktop sidebar
- [ ] E2E test covers: gate redirect → submit → lock → inline reveal → meeting detail reveal → revisit reveal
- [ ] `released` state does not break any UI (treated as `locked`)

## Technical Approach

**Files to modify:**
1. `src/routes/(app)/feedback/[id]/+page.server.ts` — load revealed feedback for locked forms, remove fallbacks
2. `src/routes/(app)/feedback/[id]/+page.svelte` — step initialization, inline reveal, waiting state
3. `src/routes/(app)/meetings/[id]/+page.server.ts` — load revealed feedback for completed meetings, remove fallback
4. `src/routes/(app)/meetings/[id]/+page.svelte` — reveal section, awaiting_feedback status, remove `?? 'TBD'`
5. `src/routes/(app)/+layout.svelte` — add new conversation link to sidebar

**Files to create:**
1. `src/lib/components/RevealCard.svelte` — shared reveal display component
2. `tests/e2e/feedback-flow.test.ts` — E2E feedback test

**Existing backend used (no changes needed):**
- `src/lib/services/feedback.ts` — `getRevealedFeedback()`, `getFormById()`, `submit()`
- `src/routes/api/meetings/[id]/feedback/+server.ts` — GET endpoint
- `src/routes/api/feedback/[id]/+server.ts` — PATCH endpoint (returns `state`)
- `submit_feedback` RPC — atomic lock when both submit
- RLS policy: reviewee reads locked forms only

**Key patterns to follow:**
- Server-side data loading (consistent with rest of app — no client-side fetch for initial render)
- Client-side fetch only for the post-PATCH reveal (PATCH → detect `locked` → fetch revealed feedback)
- `createSubscriber` not needed here (no TipTap). Standard Svelte 5 runes.
- Copy-on-write not needed (no Map/Set mutations).

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Both submit within seconds (race) | `submit_feedback` RPC uses `FOR UPDATE` lock — exactly one triggers the lock, no double-lock |
| User revisits locked form via bookmark | Server detects `locked`, loads reveal, shows immediately |
| User visits meeting detail before submitting feedback | Gate redirects them to feedback form first |
| User visits meeting detail after submitting but before other party | Shows "Awaiting feedback — you've submitted yours" |
| `general_area` is null | Area row hidden entirely |
| `otherUsername` is null | Header shows "Meeting" without "@username" |
| Form in `not_due` state accessed directly | Redirect to `/discover` |
| Form in `released` state | Treated as `locked` — show reveal |

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md](docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md) — Session 4: "The core promise — simultaneous reveal — and remaining items."
- **Release readiness plan:** [docs/plans/2026-03-28-feat-v01-release-readiness-plan.md](docs/plans/2026-03-28-feat-v01-release-readiness-plan.md) — B6 (revealed feedback UI), S6 (new conversation button)
- **Session 1 plan:** [docs/plans/2026-03-28-fix-v01-session1-infrastructure-db-plan.md](docs/plans/2026-03-28-fix-v01-session1-infrastructure-db-plan.md) — completed items referenced
- **Solution docs:** `docs/solutions/architecture/rpc-cascading-side-effects.md` (simultaneous lock pattern), `docs/solutions/architecture/feedback-gate-middleware-pattern.md` (gate exempt paths, fail-open), `docs/solutions/security-issues/rls-two-party-visibility-pattern.md` (reviewee reads locked forms)
- **Existing backend:** `src/lib/services/feedback.ts`, `src/routes/api/meetings/[id]/feedback/+server.ts`, `src/routes/api/feedback/[id]/+server.ts`
