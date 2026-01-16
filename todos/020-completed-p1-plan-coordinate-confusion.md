---
status: completed
priority: p1
issue_id: "020"
tags: [code-review, plan-review, data-integrity, coordinates]
dependencies: []
---

# Fix Viewport vs Canvas Coordinate Confusion in Plan

## Problem Statement

The plan proposes using `getBoundingClientRect()` in NoteCard.svelte to calculate `linkSide`, but this returns viewport coordinates that:
1. Change with pan/zoom
2. Are currently being persisted to database (where they become meaningless)
3. Don't match the canvas coordinate system used elsewhere

## Findings

### Data Integrity Review
The `sourceLink` field stores viewport coordinates:
```typescript
sourceLink: linkPosition  // From getBoundingClientRect!
```

These are then persisted:
```typescript
sourceLinkX: card.sourceLink?.x ?? null,
sourceLinkY: card.sourceLink?.y ?? null
```

After page reload with different viewport size or zoom, these values are invalid.

### Architecture Review
The plan calculates `linkSide` in NoteCard using viewport coordinates, but all other card positioning uses canvas coordinates. This creates a coordinate system mismatch.

### For linkSide Calculation Specifically
The **relative** position (link left of card center vs right) IS the same in viewport and canvas space because zoom is uniform scaling. However, this should be documented and the calculation should happen in Canvas.svelte where coordinate conversion already occurs.

## Proposed Solutions

### Option 1: Move linkSide Calculation to Canvas.svelte (Recommended)
**Pros:**
- Keeps coordinate logic consolidated
- NoteCard remains a "dumb" component
- Canvas already does coordinate transformation
**Cons:** Slightly more data passing
**Effort:** Small
**Risk:** Low

```typescript
// In Canvas.svelte handleLinkClick()
function handleLinkClick(noteId: string, fromCardId: string, screenPosition: Point) {
    const card = canvasStore.cards.get(fromCardId);
    if (!card) return;

    const canvasPosition: Point = {
        x: (screenPosition.x - svgRect.left - transform.x) / transform.k,
        y: (screenPosition.y - svgRect.top - transform.y) / transform.k
    };

    const cardCenterX = card.position.x + card.dimensions.width / 2;
    const linkSide: 'left' | 'right' = canvasPosition.x < cardCenterX ? 'left' : 'right';

    canvasStore.followLinkToRight(noteId, fromCardId, canvasPosition, linkSide);
}
```

### Option 2: Convert Coordinates in NoteCard
**Pros:** Self-contained calculation
**Cons:** NoteCard would need camera state, violates component boundaries
**Effort:** Medium
**Risk:** Medium

### Option 3: Document the Assumption
**Pros:** Quick fix
**Cons:** Doesn't address root cause, tech debt
**Effort:** Tiny
**Risk:** Low

## Recommended Action

Option 1 - Move linkSide calculation to Canvas.svelte where coordinate transformation already occurs.

## Technical Details

**Affected Files:**
- `plans/feat-layout-and-connecting-lines.md` (lines 140-154)
- `src/lib/components/Canvas.svelte`
- `src/lib/components/NoteCard.svelte`

## Acceptance Criteria

- [ ] Plan updated to show linkSide calculation in Canvas.svelte
- [ ] NoteCard only passes raw screen position
- [ ] Canvas performs coordinate conversion AND linkSide calculation
- [ ] Comment explains why relative position is valid across coordinate systems

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from plan review | Viewport coords are transient, should not be stored |

## Resources

- Data integrity review findings
- Architecture review findings
