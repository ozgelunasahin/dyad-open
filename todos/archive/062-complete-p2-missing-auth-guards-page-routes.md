---
status: pending
priority: p2
issue_id: "062"
tags: [code-review, frontend-plan, security, phase-2, phase-3]
dependencies: []
---

# Missing Auth Guard Specifications for Page Routes

## Problem Statement

The frontend plan mentions auth guards for `/prompts/new` and `/prompts/[id]/edit` but not for four other routes that require authentication: `/prompts/[id]`, `/profile`, `/meetings/[id]`, and `/feedback/[id]`. Without explicit auth guard requirements, implementers may omit them.

The meeting detail page is particularly sensitive — it may reveal exact location data that should only be visible to meeting participants.

## Findings

**Security review:** The existing discover page pattern (`src/routes/discover/+page.server.ts:6-8`) redirects to `/login` when unauthenticated. All new authenticated pages should follow this pattern.

**Security review:** The meeting detail page should additionally verify that the authenticated user is a participant (`participant_a` or `participant_b`) as defense-in-depth beyond the RPC function's own check.

**Security review:** Legal pages (`/impressum`, `/datenschutz`) should be added to the feedback gate exemption list in `hooks.server.ts` — users may need to access legal information regardless of feedback state.

## Proposed Solutions

### Add explicit auth checks to all authenticated page routes
Update the plan to require `requireAuth()` or redirect-to-login in every authenticated `+page.server.ts`:
- `/prompts/[id]/+page.server.ts` — auth guard, redirect to login
- `/profile/+page.server.ts` — auth guard, redirect to login
- `/meetings/[id]/+page.server.ts` — auth guard + participant verification
- `/feedback/[id]/+page.server.ts` — auth guard (gate already redirects here)

- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** 4 new `+page.server.ts` files, `src/hooks.server.ts` (gate exemptions)
- **Pattern:** Follow `src/routes/discover/+page.server.ts` redirect pattern

## Acceptance Criteria

- [ ] All authenticated page routes have explicit auth guards in `+page.server.ts`
- [ ] Meeting detail page verifies current user is a participant
- [ ] `/impressum` and `/datenschutz` added to gate exemption list
- [ ] Unauthenticated access to any authenticated route redirects to `/login`

## Resources

- Existing pattern: `src/routes/discover/+page.server.ts:6-8`
- Gate exemptions: `src/hooks.server.ts:48-58`
