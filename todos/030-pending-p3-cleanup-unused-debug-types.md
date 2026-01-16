---
status: pending
priority: p3
issue_id: "030"
tags: [code-review, simplicity, types]
dependencies: ["028"]
---

# Remove Unused Debug Visualization Types

## Problem Statement

`src/lib/types/index.ts` contains debug visualization types that are no longer used after A* pathfinding was simplified:

- `Direction` (line 72)
- `AStarExplorationFrame` (lines 74-81)
- `DebugGridCell` (lines 83-87)

These types add cognitive overhead and suggest features that don't exist.

## Findings

### Code Simplicity Review

Types defined but never imported elsewhere:
```typescript
// Debug visualization types
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface AStarExplorationFrame {
    iteration: number;
    currentNode: { x: number; y: number };
    openSet: Array<{ x: number; y: number; f: number }>;
    closedSet: Array<{ x: number; y: number }>;
    direction: Direction | null;
    turnPenaltyApplied: boolean;
}

export interface DebugGridCell {
    x: number;
    y: number;
    walkable: boolean;
}
```

## Proposed Solution

Delete lines 71-87 from `src/lib/types/index.ts`.

## Technical Details

**Affected Files:**
- `src/lib/types/index.ts` (lines 71-87)

## Acceptance Criteria

- [ ] Debug types removed from types/index.ts
- [ ] No import errors
- [ ] TypeScript compiles cleanly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from code review | Types should be removed when features are removed |

## Resources

- `src/lib/types/index.ts`
