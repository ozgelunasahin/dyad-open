---
status: completed
priority: p2
issue_id: "023"
tags: [code-review, plan-review, yagni, scope]
dependencies: []
---

# Defer Phase 4 (Visual Polish) Until Lines Work

## Problem Statement

Phase 4 proposes adding Svelte `draw` transitions for connection lines, but:
1. Connection lines are currently disabled
2. Phase 1 hasn't shipped yet
3. Animation is cosmetic polish that should come after core functionality

## Findings

### Code Simplicity Review
- Phase 4 adds complexity before the feature even works
- draw transitions require `getTotalLength()` which is synchronous and can cause jank
- Multiple simultaneous animations (rapid navigation) could cause frame drops

### Performance Review
At 10+ paths animating simultaneously:
- `getTotalLength()` is called for each path
- Main thread blocking
- Repaint thrashing from stroke-dashoffset animation

## Proposed Solutions

### Option 1: Remove Phase 4 from v1 Plan (Recommended)
**Pros:** Focus on core functionality
**Cons:** Less polished initial release
**Effort:** Tiny
**Risk:** None

### Option 2: Move to Future Enhancements
**Pros:** Documents intent without blocking
**Cons:** Creates expectation
**Effort:** Tiny
**Risk:** Low

### Option 3: Implement with Performance Guards
**Pros:** Polish from day one
**Cons:** Premature optimization
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 - Remove Phase 4 from v1. Add as follow-up task after connection lines are verified working.

## Technical Details

**Affected Files:**
- `plans/feat-layout-and-connecting-lines.md` (lines 249-280)

## Acceptance Criteria

- [ ] Phase 4 removed from plan
- [ ] Connection line rendering (Phase 1) works first
- [ ] Animation added as separate follow-up task

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from plan review | Ship working before polishing |

## Resources

- Simplicity review findings
- Performance review findings
