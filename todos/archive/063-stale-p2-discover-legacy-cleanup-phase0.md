---
status: pending
priority: p2
issue_id: "063"
tags: [code-review, frontend-plan, architecture, phase-0]
dependencies: []
---

# Discover Page Legacy Cleanup Missing from Phase 0

## Problem Statement

The existing `/discover/+page.server.ts` calls `loadPendingFeedback()` which queries legacy `meeting_invitations` and `meeting_feedback` tables. The discover page also imports `FeedbackModal.svelte`, which is listed for deletion in Phase 0. These legacy imports will break the discover page after Phase 0 deletions.

Additionally, the discover page sidebar links to `/dashboard` (line 145, 171), but the plan removes `/dashboard` in Phase 0 and replaces it with `/profile`. Between Phase 0 and Phase 3, these links will be broken.

## Findings

**Architecture review:** The `FeedbackModal` import and `loadPendingFeedback` function query legacy tables, not the new domain model. The hooks.server.ts feedback gate already handles feedback routing at the middleware level, making the in-page modal redundant.

**Architecture review:** Nav links to `/dashboard` must be updated to `/profile` in Phase 0 to avoid broken links.

## Proposed Solutions

### Fix in Phase 0
1. Remove `FeedbackModal` import from discover `+page.svelte`
2. Remove or replace `loadPendingFeedback()` from discover `+page.server.ts`
3. Update sidebar links from `/dashboard` to `/profile`
4. Update any other internal links to deleted routes

- **Effort:** Small (1 hour)
- **Risk:** Low

## Acceptance Criteria

- [ ] Discover page compiles after Phase 0 canvas deletions
- [ ] No imports of deleted components remain
- [ ] Sidebar links point to valid routes
- [ ] No legacy table queries in discover page loader

## Resources

- Discover page: `src/routes/discover/+page.svelte`, `src/routes/discover/+page.server.ts`
- Feedback gate: `src/hooks.server.ts`
