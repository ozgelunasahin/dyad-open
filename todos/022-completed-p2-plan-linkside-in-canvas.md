---
status: completed
priority: p2
issue_id: "022"
tags: [code-review, plan-review, architecture, component-design]
dependencies: ["020"]
---

# Move linkSide Calculation from NoteCard to Canvas

## Problem Statement

The plan proposes calculating `linkSide` in NoteCard.svelte, but this:
1. Violates single responsibility - NoteCard gains DOM measurement responsibility
2. Requires adding `cardElement` ref that doesn't currently exist
3. Duplicates center-calculation patterns found elsewhere in codebase

## Findings

### Architecture Review
NoteCard should remain a "dumb" presentation component. Canvas already handles:
- Coordinate transformation (viewport → canvas)
- Event handling for link clicks
- Communication with canvas store

### Pattern Recognition Review
Center calculation already exists in pathfinding.ts (lines 127-128, 197-199):
```typescript
const targetCenterX = targetCard.position.x + targetCard.dimensions.width / 2;
const sourceCenterX = sourceCard.position.x + sourceCard.dimensions.width / 2;
```

## Proposed Solutions

### Option 1: Calculate in Canvas.svelte (Recommended)
**Pros:** Consolidates coordinate logic, keeps NoteCard simple
**Cons:** None significant
**Effort:** Small
**Risk:** Low

### Option 2: Extract Utility Function
**Pros:** Reusable, testable
**Cons:** Adds file/complexity for simple calculation
**Effort:** Small
**Risk:** Low

## Recommended Action

Option 1 - Update plan to show linkSide calculation in Canvas.svelte's handleLinkClick.

## Technical Details

**Affected Files:**
- `plans/feat-layout-and-connecting-lines.md`

**Plan Update:**
Remove NoteCard.svelte code changes from Phase 2, add to Canvas.svelte section.

## Acceptance Criteria

- [ ] Plan shows linkSide calculation in Canvas.svelte
- [ ] NoteCard.svelte changes minimal (just passes screen position)
- [ ] onLinkClick signature update shown in Canvas.svelte

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from plan review | Keep components focused on single responsibility |

## Resources

- Architecture review findings
- Pattern recognition review findings
