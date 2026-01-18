---
status: pending
priority: p3
issue_id: "042"
tags: [code-review, code-quality, canvas-improvements]
dependencies: []
---

# Unused _existingPaths Parameter in findVerticalRoutingX

## Problem Statement

The `findVerticalRoutingX` function has an `_existingPaths` parameter that is never used (prefixed with underscore). This clutters call sites with unused data.

## Findings

**From TypeScript Reviewer (pathfinding.ts:278-288):**
```typescript
function findVerticalRoutingX(
    exitX: number,
    entryX: number,
    minY: number,
    maxY: number,
    cards: Card[],
    sourceCard: Card,
    targetCard: Card,
    _existingPaths: Point[][],  // Unused!
    sourceY?: number
): number {
```

The underscore prefix indicates intentionally unused, but callers still pass the value.

## Proposed Solutions

### Option A: Remove Parameter (Recommended)
If not needed, remove it and clean up call sites.

**Pros:** Cleaner API
**Cons:** Breaking change if exported
**Effort:** Small (30 min)
**Risk:** Low

### Option B: Use for Path-Aware Routing
Implement path-aware routing that avoids existing paths.

**Pros:** Better routing
**Cons:** More complex
**Effort:** Medium
**Risk:** Medium

## Technical Details

**Files to modify:**
- `src/lib/utils/pathfinding.ts`: Remove parameter or implement usage
- Search for call sites to update

## Acceptance Criteria

- [ ] Parameter either removed or used
- [ ] No unused function parameters
- [ ] Call sites cleaned up

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-18 | Created from code review | |

## Resources

- PR Branch: feat/canvas-improvements
