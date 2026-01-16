---
status: pending
priority: p2
issue_id: "027"
tags: [code-review, performance, algorithm-complexity]
dependencies: []
---

# Optimize regenerateAllPathSvgs O(n³) Complexity

## Problem Statement

The `regenerateAllPathSvgs` function in Canvas.svelte has O(n³) complexity:
- Outer loop: n connections
- `filter` operation: O(n) per connection
- `pathToSvgWithHops`: O(n * m) per connection

At 50+ connections, this causes noticeable lag (~100-200ms).

## Findings

### Performance Review
Current implementation (lines 763-782):
```typescript
function regenerateAllPathSvgs(): void {
    const allPathPoints = canvasStore.getExistingPathPoints();

    for (const conn of canvasStore.connections) {
        const storedPath = canvasStore.getStoredPath(conn.fromCardId, conn.toCardId);
        if (!storedPath) continue;

        const otherPaths = allPathPoints.filter(p => p !== storedPath.points);  // O(n)!
        const newSvgPath = pathToSvgWithHops(storedPath.points, otherPaths);    // O(n*m)!
        // ...
    }
}
```

Impact at scale:
| Connections | Approximate Ops | Estimated Time |
|-------------|-----------------|----------------|
| 10 | 5,000 | < 1ms |
| 50 | 625,000 | ~10-20ms |
| 100 | 5,000,000 | ~100-200ms |

## Proposed Solutions

### Option 1: Pre-compute Path Array with Index (Recommended)
**Pros:** O(n²) improvement, simple change
**Cons:** Still O(n²) from pathToSvgWithHops
**Effort:** Small
**Risk:** Low

```typescript
function regenerateAllPathSvgs(): void {
    const allPathPoints = canvasStore.getExistingPathPoints();
    const pathsByKey = new Map(/* ... */);

    for (let i = 0; i < canvasStore.connections.length; i++) {
        const conn = canvasStore.connections[i];
        const storedPath = pathsByKey.get(`${conn.fromCardId}-${conn.toCardId}`);
        if (!storedPath) continue;

        // Exclude by index instead of filter
        const otherPaths = allPathPoints.filter((_, idx) => idx !== i);
        // ... rest
    }
}
```

### Option 2: Spatial Indexing (Quadtree)
**Pros:** O(n log n) for intersection queries
**Cons:** Significant complexity increase
**Effort:** Large
**Risk:** Medium

### Option 3: Lazy Regeneration
**Pros:** Only compute visible paths
**Cons:** May cause visual pop-in
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 for v1, consider Option 2 if scaling past 100 connections.

## Technical Details

**Affected Files:**
- `src/lib/components/Canvas.svelte` (lines 763-782)

## Acceptance Criteria

- [ ] No repeated filtering in regeneration loop
- [ ] < 50ms for 50 connections
- [ ] < 200ms for 100 connections

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from plan review | Avoid O(n) operations inside O(n) loops |

## Resources

- Performance review findings
- `src/lib/components/Canvas.svelte` lines 763-782
