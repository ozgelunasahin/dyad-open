---
status: pending
priority: p3
issue_id: "013"
tags: [code-review, simplification, code-quality]
dependencies: []
---

# Remove Debug Visualization System

## Problem Statement

Debug mode with A* exploration frames and grid visualization is developer tooling shipped in production code. A* was removed but debug infrastructure remains (~130 lines).

## Findings

### Code Simplicity Reviewer Agent

**Files**:
- `src/lib/stores/canvas.svelte.ts:86-89, 605-625` - Debug state and methods
- `src/lib/types/index.ts:62-93` - Debug types (`AStarExplorationFrame`, `DebugGridCell`)
- Canvas and page components - Debug rendering code

**Unused code**:
- `debugMode` state
- `debugExploration` state
- `debugCurrentFrame` state
- `toggleDebugMode()` method
- `setDebugExploration()` method
- `advanceDebugFrame()` method
- Debug-related types

## Proposed Solutions

### Option A: Remove Entirely (Recommended)
- **Description**: Delete all debug visualization code
- **Pros**: ~130 LOC reduction, cleaner store
- **Cons**: Lose debug capability (can recreate if needed)
- **Effort**: Small
- **Risk**: Low

## Recommended Action

**Option A** - Remove debug system. Use browser devtools for debugging.

## Acceptance Criteria

- [ ] Debug state removed from canvas store
- [ ] Debug types removed
- [ ] Debug UI removed from components
- [ ] No debug-related code in production bundle

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by code-simplicity-reviewer agent |
