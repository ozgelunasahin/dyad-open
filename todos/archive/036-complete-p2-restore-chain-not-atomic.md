---
status: complete
priority: p2
issue_id: "036"
tags: [code-review, race-condition, performance, canvas-improvements]
dependencies: []
---

# restoreHiddenChain() Is Not Atomic (75+ lines, causes flicker)

## Problem Statement

`restoreHiddenChain()` creates cards one at a time in a loop, triggering Svelte reactivity after each addition. This causes visible stutter as cards appear sequentially, and connection lines briefly show as failed before paths are computed.

## Findings

**From Race Condition Reviewer (canvas.svelte.ts:1025-1119):**
```typescript
for (const cardId of cardIds) {
    // ... create card
    const newCards = new Map(this.cards);
    newCards.set(cardId, newCard);
    this.cards = newCards;  // Triggers rerender!

    this.connections = [...this.connections, { ... }];  // Triggers rerender!
}
// Path computation happens AFTER loop via requestAnimationFrame
```

**Visual Effect:**
1. Card 1 appears → rerender → no path yet
2. Card 2 appears → rerender → no path yet
3. ...
4. Paths computed → all lines appear at once

**From Performance Reviewer:**
- Creates n Map copies for n cards in chain
- Each Map copy is O(existing_cards)
- 10-card chain with 50 cards: ~500 copy operations

**From Simplicity Reviewer:**
- Method is 75 lines, duplicates logic from `followLinkToRight`
- Could be simplified to loop calling existing methods

## Proposed Solutions

### Option A: Batch All Updates (Recommended)
Compute everything first, then update state once.

```typescript
private restoreHiddenChain(...): boolean {
    const cardsToAdd: Card[] = [];
    const connectionsToAdd: Connection[] = [];

    // Compute all cards/connections locally
    for (const cardId of cardIds) {
        // ... create card object, push to arrays
    }

    // Single atomic update
    const newCards = new Map(this.cards);
    for (const card of cardsToAdd) {
        newCards.set(card.id, card);
    }
    this.cards = newCards;
    this.connections = [...this.connections, ...connectionsToAdd];
}
```

**Pros:** Single rerender, much faster
**Cons:** Minor refactor
**Effort:** Medium (1-2 hours)
**Risk:** Low

### Option B: Reuse openNote()
Simplify to loop calling existing method.

**Pros:** Less code, DRY
**Cons:** May have different behavior
**Effort:** Medium
**Risk:** Medium

## Technical Details

**Files to modify:**
- `src/lib/stores/canvas.svelte.ts`: Refactor `restoreHiddenChain()`

## Acceptance Criteria

- [ ] Restoring 5-card chain shows all cards simultaneously
- [ ] No visible stutter during restoration
- [ ] Connection lines appear with cards (not delayed)
- [ ] Performance: <50ms for 10-card chain restoration

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-18 | Created from code review | |

## Resources

- PR Branch: feat/canvas-improvements
