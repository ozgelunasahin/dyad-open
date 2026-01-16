---
status: completed
priority: p1
issue_id: "019"
tags: [code-review, plan-review, yagni, architecture]
dependencies: []
---

# Remove Phase 3 (Root-Relative Navigation) from Plan - YAGNI Violation

## Problem Statement

Phase 3 of the feature plan introduces `rootCardId` tracking and spatial navigation logic that:
1. Is explicitly acknowledged as unnecessary for v1 (plan lines 239-241)
2. Contains dead code where both `if` and `else` branches are identical
3. Adds complexity without user requirement

The plan itself states: "Keep the current array-based navigation but ensure the user understands that ArrowLeft = 'forward in reading chain' and ArrowRight = 'back in reading chain', regardless of spatial layout."

## Findings

### Code Simplicity Review
- Phase 3 adds 55 lines of speculative code (lines 164-246)
- The proposed navigation logic (lines 213-226) has identical branches:
```typescript
if (focusedIsRightOfRoot) {
    // decrease index
} else {
    // also decrease index
}
```
- `rootCardId` serves no purpose if navigation remains array-based

### Architecture Review
- Phase 3's incomplete implementation creates documented-but-unimplemented features
- Adds state management burden (rootCardId lifecycle) for unused functionality

### Data Integrity Review
- `rootCardId` has no cleanup when root card is closed
- Would create dangling references if implemented as proposed

## Proposed Solutions

### Option 1: Remove Phase 3 Entirely (Recommended)
**Pros:** Eliminates complexity, reduces plan by 78%, focuses on core value
**Cons:** Future spatial navigation would need re-planning
**Effort:** Small (delete section from plan)
**Risk:** None - current navigation works

### Option 2: Defer Phase 3 to v2
**Pros:** Documents future intent without blocking v1
**Cons:** Creates expectation that may not be fulfilled
**Effort:** Small (move to Future Enhancements)
**Risk:** Low

### Option 3: Implement Properly
**Pros:** Delivers on user requirement #5
**Cons:** Significant additional complexity, unclear benefit
**Effort:** Large (proper spatial navigation is non-trivial)
**Risk:** Medium - may confuse users

## Recommended Action

Option 1 - Remove Phase 3 entirely from the plan. The array-based navigation already works and matches browser back/forward semantics.

## Technical Details

**Affected Files:**
- `plans/feat-layout-and-connecting-lines.md` (lines 164-246, 352-358)

**Components:** Planning document only

## Acceptance Criteria

- [ ] Phase 3 section removed from plan
- [ ] `rootCardId` references removed from plan
- [ ] Future Enhancements section trimmed
- [ ] Plan focused on Phases 1, 2, and 4 only

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from plan review | Both if/else branches identical = dead code |

## Resources

- Plan file: `plans/feat-layout-and-connecting-lines.md`
- Simplicity review agent findings
- Architecture review agent findings
