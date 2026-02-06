---
status: complete
priority: p2
issue_id: "037"
tags: [code-review, performance, canvas-improvements]
dependencies: []
---

# regenerateAllPathSvgs() Has O(n²) Array Allocations

## Problem Statement

The path regeneration function creates new arrays on each iteration via `slice(0, i).map()`. With 100 connections, this creates ~5,000 array allocations and becomes slow.

## Findings

**From Performance Reviewer (Canvas.svelte:871-912):**
```typescript
for (let i = 0; i < connectionsWithPaths.length; i++) {
    const olderPaths = connectionsWithPaths.slice(0, i).map(c => c.points);
    // O(i) allocation per iteration = O(n²) total
    const newSvgPath = pathToSvgWithHops(points, olderPaths);
}
```

**Impact at scale:**
| Connections | Array Allocations | Estimated Time |
|-------------|-------------------|----------------|
| 10 | 45 | ~5ms |
| 50 | 1,225 | ~120ms |
| 100 | 4,950 | ~500ms+ |

**From TypeScript Reviewer:**
- Also uses `typeof canvasStore.connections[0]` which is fragile type inference

## Proposed Solutions

### Option A: Incremental Array Building (Recommended)
Build the array once, push incrementally.

```typescript
function regenerateAllPathSvgs(): void {
    // ... sort connections

    const olderPaths: Point[][] = [];
    for (let i = 0; i < connectionsWithPaths.length; i++) {
        const { conn, points } = connectionsWithPaths[i];
        const newSvgPath = pathToSvgWithHops(points, olderPaths);
        // ... update path
        olderPaths.push(points);  // O(1) amortized
    }
}
```

**Pros:** O(n) instead of O(n²), trivial change
**Cons:** None
**Effort:** Small (15 min)
**Risk:** Very low

### Option B: Spatial Indexing
Use R-tree for intersection detection.

**Pros:** O(log n) queries
**Cons:** Complex, overkill for current scale
**Effort:** High
**Risk:** Medium

## Technical Details

**Files to modify:**
- `src/lib/components/Canvas.svelte`: Fix `regenerateAllPathSvgs()`

## Acceptance Criteria

- [ ] No `slice().map()` pattern in regeneration loop
- [ ] Performance: <50ms for 100 connections
- [ ] All paths render correctly with hops

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-18 | Created from code review | |

## Resources

- PR Branch: feat/canvas-improvements
