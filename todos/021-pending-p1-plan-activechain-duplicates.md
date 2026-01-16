---
status: pending
priority: p1
issue_id: "021"
tags: [code-review, plan-review, data-integrity, state-management]
dependencies: []
---

# Prevent Duplicate Card IDs in activeChain

## Problem Statement

The canvas store can add the same card ID to `activeChain` multiple times, creating chains like `['A', 'B', 'A', 'C']`. This causes:
1. Confusing navigation (pressing back multiple times to get past duplicate)
2. Incorrect chain length calculations
3. Unexpected behavior in spatial navigation if implemented

## Findings

### Data Integrity Review
Line 327 in `canvas.svelte.ts` appends without checking for duplicates:
```typescript
this.activeChain = [...this.activeChain, noteId]; // noteId may already be in chain!
```

This occurs in `openNote()` when a card already exists on the canvas.

### Existing Code Analysis
When clicking a link to an already-open card:
1. `followLinkToRight()` truncates chain at current position (line 659)
2. Then appends the existing card's ID
3. If the existing card was earlier in the chain, it now appears twice

## Proposed Solutions

### Option 1: Remove Existing Before Appending (Recommended)
**Pros:** Simple, maintains most recent position
**Cons:** Changes chain history
**Effort:** Small
**Risk:** Low

```typescript
private addToActiveChain(cardId: string): void {
    const filtered = this.activeChain.filter(id => id !== cardId);
    this.activeChain = [...filtered, cardId];
}
```

### Option 2: Skip Append if Already Present
**Pros:** Preserves original position
**Cons:** May not reflect actual navigation intent
**Effort:** Small
**Risk:** Low

### Option 3: Use Set for Tracking + Array for Order
**Pros:** O(1) duplicate detection
**Cons:** More complex data structure
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 - Create helper method that removes existing occurrence before appending.

## Technical Details

**Affected Files:**
- `src/lib/stores/canvas.svelte.ts`

**Lines to Modify:**
- Line 327, 387 (openNote)
- Line 659-662 (followLinkToRight)

## Acceptance Criteria

- [ ] No duplicate card IDs ever appear in activeChain
- [ ] Navigation back/forward works correctly
- [ ] Unit test verifies deduplication

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from plan review | Duplicates break navigation semantics |

## Resources

- Data integrity review findings
- `src/lib/stores/canvas.svelte.ts` lines 327, 387, 659-662
