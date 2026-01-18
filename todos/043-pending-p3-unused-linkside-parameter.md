---
status: pending
priority: p3
issue_id: "043"
tags: [code-review, code-quality, canvas-improvements]
dependencies: []
---

# Unused linkSide Parameter in followLinkToRight

## Problem Statement

The `linkSide` parameter was removed from `calculateNewCardPosition` but still exists in `followLinkToRight`. It's passed but never used.

## Findings

**From TypeScript Reviewer (canvas.svelte.ts:934):**
```typescript
followLinkToRight(
    noteId: string,
    fromCardId: string,
    sourceBounds: SourceBounds,
    linkSide?: LinkSide  // Still here but unused
): boolean {
```

The diff shows `linkSide` was removed from `calculateNewCardPosition` signature, but the parameter chain wasn't fully cleaned up.

## Proposed Solutions

### Option A: Remove from followLinkToRight (Recommended)
Complete the removal.

**Pros:** Clean API
**Cons:** Breaking change if called externally
**Effort:** Small (15 min)
**Risk:** Low

### Option B: Keep for Future Use
Document as reserved for future routing hints.

**Pros:** Ready for future features
**Cons:** Dead code
**Effort:** None
**Risk:** None

## Technical Details

**Files to modify:**
- `src/lib/stores/canvas.svelte.ts`: Remove `linkSide` parameter
- Check all call sites

## Acceptance Criteria

- [ ] No unused parameters in followLinkToRight
- [ ] Call sites updated
- [ ] LinkSide type removed if completely unused

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-18 | Created from code review | |

## Resources

- PR Branch: feat/canvas-improvements
