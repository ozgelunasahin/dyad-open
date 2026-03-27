---
status: pending
priority: p1
issue_id: "061"
tags: [code-review, frontend-plan, ux, phase-2]
dependencies: []
---

# Auto-Save Loses Edits on Navigation Away

## Problem Statement

The auto-save pattern in the frontend plan uses a `setTimeout` with 1.5s debounce. If the user types and navigates away (clicking a link, pressing back, closing tab) within 1.5s, the pending save is silently discarded. The user sees no warning and loses their last edits.

This is the primary author-facing interaction. Even at 10 users, silent data loss erodes trust in the "auto-save" indicator.

## Findings

**Performance review:** The `setTimeout` callback never fires when the component is destroyed on navigation. SvelteKit provides `beforeNavigate` hook and browsers provide `beforeunload` event for this exact scenario.

**Architecture review:** The auto-save code sample also lacks a generation counter to guard against race conditions when saves complete out of order (separate todo #067).

## Proposed Solutions

### Option A: beforeNavigate + beforeunload guards (Recommended)
Add SvelteKit's `beforeNavigate` hook to flush pending saves before in-app navigation. Add `beforeunload` event listener for tab close/external navigation.

```typescript
import { beforeNavigate } from '$app/navigation';

beforeNavigate(async ({ cancel }) => {
    if (saveTimer) {
        clearTimeout(saveTimer);
        cancel(); // Block navigation
        await saveNow(); // Flush save
        // Then re-navigate programmatically
    }
});
```

- **Pros:** Prevents data loss, zero runtime cost when no save is pending
- **Cons:** Brief delay on navigation (~100ms for the save request)
- **Effort:** Small (30 minutes)
- **Risk:** Low

### Option B: navigator.sendBeacon for fire-and-forget
Use `navigator.sendBeacon` or `fetch` with `keepalive: true` to send the save request without blocking navigation.

- **Pros:** No navigation delay
- **Cons:** No confirmation that the save succeeded; sendBeacon has payload size limits
- **Effort:** Small
- **Risk:** Medium — save may fail silently

## Recommended Action

Option A — blocking save on navigation. The ~100ms delay is imperceptible and guarantees data integrity.

## Technical Details

- **Affected files:** New editor pages (`src/routes/prompts/new/+page.svelte`, `src/routes/prompts/[id]/edit/+page.svelte`)
- **Pattern:** Add `beforeNavigate` + `beforeunload` alongside the debounce timer

## Acceptance Criteria

- [ ] Typing then immediately clicking a nav link saves the content before navigating
- [ ] Closing the tab while editing shows browser's "unsaved changes" warning
- [ ] Save status indicator shows "saving" during the flush
- [ ] No data loss when navigating within 1.5s of typing

## Resources

- Plan: `docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md` lines 142-159
- SvelteKit docs: `beforeNavigate` from `$app/navigation`
