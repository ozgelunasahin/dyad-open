---
title: "feat: Reader/engagement experience — prompt detail, meetings, feedback, discover enhancements"
type: feat
status: active
date: 2026-03-26
origin: docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md
---

# Reader/Engagement Experience

PR 4 of the frontend v0.1 plan. Build the pages a reader needs: read a prompt, comment, invite to meet, view meeting details, submit feedback. Plus discover feed enhancements.

## Overview

Completes the full user journey. After PR 3 (author experience), users can create and publish prompts. This PR adds the reader side: discovering, engaging, meeting, and giving feedback. All backend API endpoints exist and are tested.

(see parent plan: `docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md` Phase 3)

## Implementation Steps

### Step 1: Prompt detail page

`src/routes/(app)/prompts/[id]/+page.server.ts`:
- [ ] Load prompt detail via `SupabasePromptQueryService.getPromptDetail()` directly
- [ ] Load comments via `SupabaseCommentService.getCommentsForPrompt()` and own comment via `getMyComment()`
- [ ] `Promise.all` for parallel loading

`src/routes/(app)/prompts/[id]/+page.svelte`:
- [ ] Render `body_html` via `{@html}` (safe — comes from `renderTiptapToHtml` with DOMPurify)
- [ ] Cover image with `loading="lazy"`
- [ ] Available time slots: date, time, general area
- [ ] Author username
- [ ] Comment form: textarea, submit via `POST /api/prompts/[id]/comments`. Show own comment if exists. Privacy indicator: "Only visible to you and the prompt author"
- [ ] Invite flow: select a slot, optional message, send via `POST /api/prompts/[id]/invitations`. Show confirmation.

### Step 2: Meeting detail page

`src/routes/(app)/meetings/[id]/+page.server.ts`:
- [ ] Load meeting via `SupabaseMeetingService.getWithLocation()` (tries full detail first, falls back to getDetail)
- [ ] Verify current user is participant (defense-in-depth)

`src/routes/(app)/meetings/[id]/+page.svelte`:
- [ ] Show: scheduled time, duration, general area (or exact location if active), other participant
- [ ] Cancel button with browser `confirm()` dialog

### Step 3: Feedback form page

`src/routes/(app)/feedback/[id]/+page.server.ts`:
- [ ] Load form via `SupabaseFeedbackService` (add `getFormById` method if missing)
- [ ] Load vocabulary via `SupabaseFeedbackService.getVocabulary()`
- [ ] `Promise.all` for parallel loading

`src/routes/(app)/feedback/[id]/+page.svelte`:
- [ ] Did-meet toggle (yes/no)
- [ ] Rating tags from vocabulary (multi-select)
- [ ] Free text note
- [ ] Share-with-person toggle, share-with-platform toggle
- [ ] Submit via `PATCH /api/feedback/[id]`
- [ ] Show "waiting for other party" if submitted but not locked
- [ ] Show revealed feedback if locked

### Step 4: Discover page enhancements

`src/routes/(app)/discover/+page.svelte`:
- [ ] Make prompt cards clickable → navigate to `/prompts/[id]`
- [ ] Add "Start a prompt" button linking to `/prompts/new`
- [ ] Cover images with `loading="lazy"` + explicit dimensions

### Step 5: Verify

- [ ] Build passes
- [ ] All tests pass
- [ ] Full reader flow: discover → click prompt → read → comment → invite
- [ ] Meeting detail shows location for active meetings
- [ ] Feedback form works end-to-end (gate → form → submit → gate clears)
- [ ] Discover cards are clickable

## Acceptance Criteria

- [ ] Build passes
- [ ] Tests pass
- [ ] Full reader journey: discover → detail → comment → invite → meeting → feedback
- [ ] Comment privacy model communicated ("only visible to you and the author")
- [ ] Meeting detail verifies participant identity
- [ ] Feedback form loads vocabulary from API
- [ ] Discover cards clickable + "Start a prompt" button

## Sources

- **Parent plan:** `docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md` Phase 3
- **Feedback service:** `src/lib/services/feedback.ts`
- **Comment service:** `src/lib/services/comment.ts`
- **Invitation service:** `src/lib/services/invitation.ts`
- **Meeting service:** `src/lib/services/meeting.ts`
