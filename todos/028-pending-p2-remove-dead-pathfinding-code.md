---
status: pending
priority: p2
issue_id: "028"
tags: [code-review, simplicity, dead-code]
dependencies: []
---

# Remove Dead A* Pathfinding Code

## Problem Statement

The codebase contains ~300+ lines of dead code from the original A* pathfinding implementation that was replaced with simpler heuristic routing. This code is never executed but adds maintenance burden and confusion.

## Findings

### Code Simplicity Review

Dead code identified in `src/lib/utils/pathfinding.ts`:

1. **Debug visualization types** (types/index.ts lines 71-102):
   - `Direction`, `AStarExplorationFrame`, `DebugGridCell`
   - Only used by removed debug visualization

2. **A* implementation remnants**:
   - `createGrid()` function (if exists)
   - `astar()` function (if exists)
   - Grid-related utilities

3. **Unused parameters in `findVerticalRoutingX`**:
   - `_minY`, `_maxY`, `_cards`, `_targetCard`, `_existingPaths`
   - All prefixed with `_` indicating unused

## Proposed Solution

### Single Pass Cleanup
**Pros:** One PR, easy to review
**Cons:** Large diff
**Effort:** Small
**Risk:** Low (code is already not executed)

1. Remove unused types from `types/index.ts`
2. Remove unused function parameters
3. Delete any remaining A* related code

## Technical Details

**Affected Files:**
- `src/lib/types/index.ts` - Remove debug types
- `src/lib/utils/pathfinding.ts` - Remove unused params, dead functions

## Acceptance Criteria

- [ ] No unused type definitions remain
- [ ] No unused function parameters (no `_` prefixed params)
- [ ] All exported functions are actually used
- [ ] TypeScript compiles without errors
- [ ] All tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from code review | Dead code from refactors should be cleaned immediately |

## Resources

- Code simplicity review findings
- `src/lib/utils/pathfinding.ts`
- `src/lib/types/index.ts`
