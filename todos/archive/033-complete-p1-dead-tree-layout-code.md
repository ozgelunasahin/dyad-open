---
status: pending
priority: p1
issue_id: "033"
tags: [code-review, dead-code, yagni, canvas-improvements]
dependencies: []
---

# Dead Tree Layout Code (166+ lines)

## Problem Statement

The `tree-layout.ts` file (166 lines) and related store code (~45 lines) are completely unused. The d3-flextree dependency was added but the feature is never called. This adds bundle size, maintenance burden, and confusion.

## Findings

**From TypeScript Reviewer:**
- `computeAndCacheTreeLayout()` defined at canvas.svelte.ts:359 - never called
- `getPrecomputedPosition()` defined at canvas.svelte.ts:384 - never called
- `currentTreeRoot` always null (never set to any value)
- `treeLayoutCache` initialized/cleared but never populated

**From Simplicity Reviewer:**
- Entire tree-layout.ts is dead code
- d3-flextree dependency adds ~15KB to bundle for unused feature
- Estimated 211 lines of removable code

**From Architecture Reviewer:**
- This is explicitly rejected in the plan review (plans/feat-optimized-internal-layout.md)
- YAGNI violation: feature was designed but never implemented

## Proposed Solutions

### Option A: Delete Everything (Recommended)
Remove tree-layout.ts and all references in canvas.svelte.ts.

**Pros:** Cleaner codebase, smaller bundle
**Cons:** Work if feature needed later
**Effort:** Small (30 min)
**Risk:** Low

### Option B: Gate Behind Feature Flag
Keep code but add explicit opt-in.

**Pros:** Ready for future use
**Cons:** Still in bundle, still confusing
**Effort:** Small (1 hour)
**Risk:** Low

## Technical Details

**Files to modify:**
- Delete: `src/lib/utils/tree-layout.ts`
- Edit: `src/lib/stores/canvas.svelte.ts`
  - Remove import (line 6)
  - Remove `treeLayoutCache` state (line 99-100)
  - Remove `currentTreeRoot` state (line 101-102)
  - Remove `computeAndCacheTreeLayout()` (lines 358-378)
  - Remove `getPrecomputedPosition()` (lines 383-391)
  - Remove clearing in `initialize()` and `hardReset()`
- Edit: `package.json` - consider removing d3-flextree if not used elsewhere

## Acceptance Criteria

- [ ] tree-layout.ts deleted
- [ ] No references to tree layout in canvas.svelte.ts
- [ ] `npm run build` succeeds
- [ ] d3-flextree removed from package.json if unused

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-18 | Created from code review | |

## Resources

- PR Branch: feat/canvas-improvements
- Related file: plans/feat-optimized-internal-layout.md (rejected approach)
