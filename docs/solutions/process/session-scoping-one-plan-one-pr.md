---
title: "Session scoping: one plan → one PR → one review"
problem_type: process
modules: [planning, review, implementation]
severity: high
date_discovered: 2026-03-28
status: resolved
tags: [process, scoping, planning, claude-workflow]
---

# Session scoping: one plan → one PR → one review

## Problem

Session 3 was scoped as a single brainstorm covering security fixes, navigation overhaul, core page UX, copy centralization, profile redesign, meeting notifications, and a responsive audit. This was then split into "3a" and "3b" but even 3b contained ~10 independent workstreams (discover visibility, conversation detail UX, map distance grouping, ConfirmDialog, cancel meeting notification, stack of cards profile, copy.ts wiring, editor placeholder, email fixes, responsive audit). The result:

- A single PR (#66) grew to 30+ commits across 110 files
- Ad-hoc user feedback during implementation created scope creep
- Review findings accumulated faster than they could be addressed
- The simplicity reviewer couldn't assess coherence because the changes were too varied
- Multiple design iterations on the profile page (3 rewrites) that would have been caught earlier with a focused plan

## Root Cause

The brainstorm produced a comprehensive gap analysis (good) but didn't enforce session boundaries. Items were grouped by "phase" (security, pages, polish) rather than by **deliverable unit**. Each session should produce one reviewable, mergeable artifact.

## Solution

**One deliverable = one plan = one PR = one review cycle.**

When scoping sessions from a brainstorm or gap analysis:

1. **Each session should take 1-3 hours of implementation** — if the plan has more than ~5 checkboxes, it's too big
2. **Each session should touch one concern** — don't mix DB migrations with UI redesigns with copy extraction
3. **Each session should be independently reviewable** — the reviewer shouldn't need context from 3 other sessions to assess the changes
4. **Ad-hoc feedback during implementation goes into todos**, not into the current PR. Resist the urge to fix everything while you're in the file.

### Bad scoping (what happened):
```
Session 3b: Core Pages + Copy + Polish
  - Discover visibility changes
  - Conversation detail UX (8 sub-items)
  - Archive RPC
  - ConfirmDialog component
  - Map pin distance grouping
  - Profile meeting cancellation + notification
  - Stack of cards profile preview
  - Editor placeholder
  - Wire copy.ts into all components
  - Email copy fixes
  - FloatingNav consistency
  - Responsive audit
```

### Good scoping (what should have happened):
```
Session 3b: Conversation detail UX
Session 3c: copy.ts wiring
Session 3d: Profile redesign (stack of cards)
Session 3e: Cancel meeting notification
Session 3f: Map + BottomSheet interaction
```

## Prevention

- **Before starting `/workflows:work`**: count the checkboxes. If > 5, split the plan.
- **During implementation**: if user feedback introduces a new workstream, create a todo and defer to next session. Don't expand the current PR.
- **At review time**: if the diff is > 500 lines of implementation code (excluding docs/migrations), the session was too big.

## Related

- `docs/solutions/process/review-before-implement-pattern.md` — review the plan before implementing
- `docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md` — the brainstorm that produced the oversized session
