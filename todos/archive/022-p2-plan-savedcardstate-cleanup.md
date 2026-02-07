---
status: pending
priority: p2
id: "022"
tags: [code-review, data-integrity, memory-leak, state-management]
---

# Add Cleanup for savedCardState When Cards Close

## Problem Statement

The `savedCardState` Map saves camera positions for every visited card but is never pruned when cards are closed. This creates "ghost state" holding references to cards that no longer exist.

## Findings

### Data Integrity Review
Current behavior:
```typescript
private savedCardState = $state<Map<string, {
    camera: Camera;
    linkTarget?: string;
    linkFocusActive?: boolean;
}>>(new Map());
```

When a card is closed via `unopenCurrentCard()`:
- Card is removed from `this.cards`
- Connections are cleaned up
- Stored paths are cleaned up
- BUT `savedCardState` is NOT cleaned up

Over a long session with many cards, this Map grows unbounded.

## Proposed Solutions

### Option 1: Clean Up in unopenCurrentCard() (Recommended)
**Pros:** Consistent with other cleanup logic
**Cons:** None
**Effort:** Small
**Risk:** Low

```typescript
private cleanupSavedState(cardId: string): void {
    if (this.savedCardState.has(cardId)) {
        const newMap = new Map(this.savedCardState);
        newMap.delete(cardId);
        this.savedCardState = newMap;
    }
}

// In unopenCurrentCard():
this.cleanupSavedState(cardToUnopen);
```

### Option 2: Lazy Cleanup on Access
**Pros:** No overhead on close
**Cons:** Stale data lingers
**Effort:** Small
**Risk:** Low

## Recommended Action

Option 1 - Add cleanup to `unopenCurrentCard()` for consistency with other cleanup operations.

## Technical Details

**Affected Files:**
- `src/lib/stores/canvas.svelte.ts`

**Lines to Modify:**
- Add after line 713 in `unopenCurrentCard()`

## Acceptance Criteria

- [ ] `savedCardState` entry removed when card is closed
- [ ] No orphaned state references
- [ ] Works with `reset()` method too

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from plan review | Clean up all related state together |

## Resources

- Data integrity review findings
- `src/lib/stores/canvas.svelte.ts` lines 99-103, 676-733
