---
status: pending
priority: p2
id: "036"
tags: [code-review, performance, reactivity]
---

# Per-Frame Map Allocation in Scroll/Zoom Handler

## Problem Statement

`updateReadingPosition()` in `canvas.svelte.ts` (lines 1126-1148) creates a new `Map(this.savedCardState)` on every d3-zoom event — potentially 60 times per second during panning. This causes GC pressure and unnecessary Svelte reactivity triggers since `savedCardState` is a `$state` property.

## Findings

### Performance Oracle Agent

- `canvas.svelte.ts:1126-1148` — `updateReadingPosition()` copies entire `savedCardState` Map per frame
- Same pattern in `focusCard()` at line 794 and `saveLinkState()` at line 1117
- Each copy triggers `$state` reassignment → downstream `$derived` recomputation
- With many saved card states, each copy becomes more expensive

## Proposed Solutions

### Option A: Throttle updateReadingPosition (Recommended)
Throttle to once every 100-200ms using requestAnimationFrame or a simple timer.
- **Pros:** Simple, preserves reactivity model, significant reduction in allocations
- **Cons:** Slight delay in reading position updates (imperceptible to user)
- **Effort:** Small
- **Risk:** Low

### Option B: Use non-reactive property for reading position
Store reading position in a plain (non-`$state`) property since nothing renders from it directly.
- **Pros:** Zero reactivity overhead, zero Map copies during scroll
- **Cons:** Requires careful analysis of what depends on `savedCardState`
- **Effort:** Medium
- **Risk:** Medium — may break derived state that reads from savedCardState

## Technical Details

**Affected files:**
- `src/lib/stores/canvas.svelte.ts` (lines 794, 1117, 1126-1148)

## Acceptance Criteria

- [ ] Map allocation during continuous scroll/zoom reduced by 90%+
- [ ] Reading position still saved accurately after scroll stops
- [ ] No visible jank improvement measurable via DevTools Performance panel
