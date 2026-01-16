# Code Review Cleanup

Address 5 open todos from multi-agent code review (028-032).

## Overview

Internal refactoring with no user-facing changes. Improves code quality, type safety, and performance.

## Phase 1: Safe Deletions (Low Risk)

### 1.1 Remove Unused Debug Types (Todo 030)

Delete from `src/lib/types/index.ts` (lines 71-102):
- `Direction` (line 72)
- `AStarExplorationFrame` (lines 74-81)
- `DebugGridCell` (lines 83-87)
- `PathResult` (lines 92-94)
- `CrossingInfo` (lines 96-102)

Update `PathMethod` (line 90) to remove unused variants:
```typescript
// Before
export type PathMethod = 'heuristic-L' | 'heuristic-Z' | 'astar' | 'fallback';

// After
export type PathMethod = 'heuristic-L' | 'heuristic-Z';
```

### 1.2 Remove Dead Debug State (Todo 028)

Delete from `src/lib/stores/canvas.svelte.ts`:
- `debugExploration` state
- `debugCurrentFrame` state
- `setDebugExploration()` method
- `advanceDebugFrame()` method

## Phase 2: Create Shared Utilities (Todo 032)

### 2.1 Create Type Guards

Create `src/lib/utils/type-guards.ts`:
```typescript
/** Type guard for HTMLElement */
export function isHTMLElement(el: Element | null): el is HTMLElement {
  return el !== null && el instanceof HTMLElement;
}

/** Safe Map.get that returns undefined (with type narrowing) */
export function mapGet<K, V>(map: Map<K, V>, key: K): V | undefined {
  return map.get(key);
}
```

### 2.2 Create Geometry Utilities

Create `src/lib/utils/geometry.ts`:
```typescript
import type { Point, Card } from '$lib/types';

/** Get center point of a card */
export function cardCenter(card: Card): Point {
  return {
    x: card.position.x + card.dimensions.width / 2,
    y: card.position.y + card.dimensions.height / 2
  };
}

/** Get bounding box of a card */
export function cardBounds(card: Card) {
  return {
    left: card.position.x,
    right: card.position.x + card.dimensions.width,
    top: card.position.y,
    bottom: card.position.y + card.dimensions.height
  };
}

/** Check if segment is horizontal (within tolerance) */
export function isHorizontal(start: Point, end: Point, tolerance = 1): boolean {
  return Math.abs(end.y - start.y) < tolerance;
}

/** Check if segment is vertical (within tolerance) */
export function isVertical(start: Point, end: Point, tolerance = 1): boolean {
  return Math.abs(end.x - start.x) < tolerance;
}
```

## Phase 3: Fix Type Assertions (Todo 031)

Replace unsafe `as` casts with type guards. Pattern:

```typescript
// Before
const target = event.target as HTMLElement;

// After
if (!isHTMLElement(event.target)) return;
const target = event.target;
```

**Locations to fix:**

| File | Line | Pattern |
|------|------|---------|
| Canvas.svelte | 44 | `event.target as Element` |
| Canvas.svelte | 149, 163 | `event as CustomEvent<...>` |
| Canvas.svelte | 245, 544 | `Array.from(...) as HTMLElement[]` |
| Canvas.svelte | 753 | `event.target as Element` |
| NoteCard.svelte | 163, 191 | `event.target as HTMLElement` |
| NoteCard.svelte | 167 | `target.closest(...) as HTMLElement` |

**Strategy:** Early return with no error for DOM assertions (graceful degradation).

## Phase 4: Optimize Layout Scoring (Todo 029)

Add early termination to `computePlacementScore` in `src/lib/utils/layout.ts`:

```typescript
function computePlacementScore(candidate: Point, cards: Card[]): number {
  // Early termination on overlap
  for (const card of cards) {
    if (overlapsCard(candidate, card)) {
      return -Infinity;
    }
  }

  // Continue with scoring...
}
```

**Note:** Spatial indexing deferred until >100 cards shows performance issues.

## Acceptance Criteria

- [ ] TypeScript compiles with no errors
- [ ] No unused type definitions remain
- [ ] No `as HTMLElement` without prior instanceof check
- [ ] All geometry calculations use shared utilities
- [ ] Layout scoring terminates early on overlap
- [ ] All existing functionality preserved

## Files Changed

```
src/lib/types/index.ts           # Remove unused types
src/lib/stores/canvas.svelte.ts  # Remove dead debug state
src/lib/utils/type-guards.ts     # NEW - type guard utilities
src/lib/utils/geometry.ts        # NEW - geometry utilities
src/lib/utils/layout.ts          # Early termination
src/lib/utils/pathfinding.ts     # Use geometry utilities
src/lib/components/Canvas.svelte # Fix type assertions
src/lib/components/NoteCard.svelte # Fix type assertions
```

## References

- Todo 028: `todos/028-pending-p2-remove-dead-pathfinding-code.md`
- Todo 029: `todos/029-pending-p2-layout-scoring-performance.md`
- Todo 030: `todos/030-pending-p3-cleanup-unused-debug-types.md`
- Todo 031: `todos/031-pending-p2-type-safety-assertions.md`
- Todo 032: `todos/032-pending-p3-dry-violations-canvas.md`
