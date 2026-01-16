---
status: pending
priority: p2
issue_id: "029"
tags: [code-review, performance, algorithm-complexity]
dependencies: []
---

# Optimize Layout Scoring Algorithm Complexity

## Problem Statement

The layout scoring in `pathfinding.ts` has O(n²) complexity in `computePlacementScore` where n is the number of cards. For each candidate placement, it iterates through all existing cards to check overlaps.

## Findings

### Performance Review

Current flow:
1. `findOptimalPlacement` generates candidate positions
2. For each candidate, `computePlacementScore` is called
3. `computePlacementScore` iterates all cards to check overlaps → O(n)
4. With k candidates and n cards → O(k * n)

For a canvas with 50 cards and 10 candidates per placement, this is 500 overlap checks per new card placement.

### Current Implementation Pattern
```typescript
function computePlacementScore(candidate: Point, cards: Card[]): number {
    let score = 0;
    for (const card of cards) {  // O(n) per candidate
        // Check overlap, compute distance penalties
    }
    return score;
}
```

## Proposed Solutions

### Option 1: Early Termination (Recommended)
**Pros:** Simple change, significant improvement
**Cons:** Doesn't fix worst case
**Effort:** Small
**Risk:** Low

Add early termination when overlap detected:
```typescript
function computePlacementScore(candidate: Point, cards: Card[]): number {
    for (const card of cards) {
        if (overlaps(candidate, card)) {
            return -Infinity; // Early termination
        }
    }
    // Continue with other scoring
}
```

### Option 2: Spatial Index (R-tree)
**Pros:** O(log n) overlap queries
**Cons:** Complexity, overkill for <100 cards
**Effort:** Large
**Risk:** Medium

### Option 3: Grid-based Bucketing
**Pros:** O(1) average case for nearby cards
**Cons:** Memory overhead
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 for now. Only consider spatial indexing if canvas exceeds 100 cards.

## Technical Details

**Affected Files:**
- `src/lib/utils/pathfinding.ts`

## Acceptance Criteria

- [ ] Placement scoring uses early termination on overlap
- [ ] < 10ms for placing card on 50-card canvas
- [ ] No visual regression in card placement

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from performance review | Early termination is often sufficient |

## Resources

- Performance oracle review findings
