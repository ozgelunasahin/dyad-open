---
status: complete
priority: p2
issue_id: "039"
tags: [code-review, dry, code-quality, canvas-improvements]
dependencies: []
---

# Duplicate Geometry Functions in layout.ts and pathfinding.ts

## Problem Statement

Both `layout.ts` and `pathfinding.ts` contain nearly identical implementations of geometry helper functions: `sharesEndpoint`, `pointsClose`, `segmentsIntersect`, `direction`. This violates DRY and risks divergent behavior.

## Findings

**From Pattern Recognition Reviewer:**

**pathfinding.ts (lines 406-469):**
- `pointsClose()` with tolerance 3
- `sharesEndpoint()`, `segmentsIntersect()`, `direction()`

**layout.ts (lines 416-443):**
- `pointsClose()` with tolerance 5 (different!)
- `sharesEndpoint()`, `segmentsIntersect()`, `direction()`

**Issue:** Different tolerance values could cause inconsistent intersection detection between layout scoring and path routing.

## Proposed Solutions

### Option A: Extract to geometry.ts (Recommended)
Create shared utility module.

```typescript
// src/lib/utils/geometry.ts
export const TOLERANCE = 5;  // Or make configurable

export function pointsClose(p1: Point, p2: Point, tolerance = TOLERANCE): boolean {
    return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
}

export function sharesEndpoint(...): boolean { ... }
export function segmentsIntersect(...): boolean { ... }
export function direction(...): number { ... }
```

**Pros:** Single source of truth, consistent behavior
**Cons:** Minor refactor
**Effort:** Small (1 hour)
**Risk:** Low

### Option B: Import from pathfinding.ts
Export from one, import in other.

**Pros:** Less change
**Cons:** Creates dependency direction that may not be ideal
**Effort:** Small
**Risk:** Low

## Technical Details

**Files to modify:**
- Create: `src/lib/utils/geometry.ts`
- Edit: `src/lib/utils/layout.ts` - import from geometry
- Edit: `src/lib/utils/pathfinding.ts` - export to geometry

**Functions to consolidate:**
- `pointsClose(p1, p2, tolerance?)`
- `sharesEndpoint(p1, p2, p3, p4)`
- `segmentsIntersect(p1, p2, p3, p4)`
- `direction(p, q, r)`

## Acceptance Criteria

- [ ] Single implementation of each geometry function
- [ ] Consistent tolerance used everywhere
- [ ] No duplicate code between layout.ts and pathfinding.ts
- [ ] All tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-18 | Created from code review | |

## Resources

- PR Branch: feat/canvas-improvements
