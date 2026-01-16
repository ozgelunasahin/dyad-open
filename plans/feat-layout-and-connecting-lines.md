# Feature: Bidirectional Layout with Connecting Lines

## Summary

Enable connecting lines and allow cards to be placed on either side based on link position. This is a minimal implementation—the infrastructure already exists.

## User Requirements

1. **Links to existing notes open alongside** - Current visual layout style ✓ (already works)
2. **Connecting lines from link underlines to cards** - Currently disabled, just needs uncommenting
3. **Card placement minimizes connecting line length** - Prefer placing cards on the same side as the link
4. **Relax "always place to the right" constraint** - Allow left-side placement when link is on left
5. ~~Active chain navigation uses root card as reference~~ - **Removed**: Current navigation already works correctly

### Phase 3 Requirements: Card Focus & Navigation Behavior

6. **Two-click card focusing**:
   - First click on unfocused card → focus (highlight) without panning
   - Second click on already-focused card → pan to reading position

7. **Zoom level preservation**:
   - NEVER change zoom level when navigating between cards
   - User controls their own reading zoom
   - Zoom is independent of focus/pan operations

8. **Link following behavior**:
   - Following a link → focus AND pan in one action (immediate reading position)

9. **Zoom-independent reading positions**:
   - Save focus point in canvas coordinates (not camera coordinates)
   - When restoring, compute camera position at CURRENT zoom level
   - This ensures reading position is consistent regardless of zoom changes

---

## Current State (Key Discovery)

**The infrastructure already exists.** The review found:

| Feature | Status |
|---------|--------|
| Left-side placement | ✓ Implemented (penalized with 200 pts) |
| Bidirectional pathfinding | ✓ Implemented (Z-route-L method) |
| Connection line rendering | ✓ Implemented but DISABLED |
| Link position tracking | ✓ Already passed through |

**Minimal implementation = ~4 lines of actual code changes.**

---

## Implementation Plan

### Phase 1: Enable Connecting Lines

**File:** `src/lib/components/Canvas.svelte`

**Task:** Uncomment lines 850-852 to re-enable connection line rendering.

```svelte
<!-- Currently commented out - UNCOMMENT: -->
{#each connectionPaths as conn (conn.key)}
    <ConnectionLine path={conn.svgPath} pathFailed={conn.pathFailed} />
{/each}
```

**Acceptance Criteria:**
- [ ] Connection lines visible when following links
- [ ] Lines connect from link position to target card edge
- [ ] Lines render with hop arcs at crossings

---

### Phase 2: Link-Position-Aware Placement

Allow cards to be placed on the left when the clicked link is on the left side of the source card.

**Files to modify:**
- `src/lib/types/index.ts` - Add `LinkSide` type
- `src/lib/components/Canvas.svelte` - Calculate linkSide (has access to transform)
- `src/lib/stores/canvas.svelte.ts` - Pass linkSide to layout
- `src/lib/utils/layout.ts` - Adjust scoring based on linkSide

#### Step 2.1: Add LinkSide Type

**File:** `src/lib/types/index.ts`

```typescript
export type LinkSide = 'left' | 'right';
```

#### Step 2.2: Calculate linkSide in Canvas.svelte

**Important:** Calculate in Canvas.svelte, NOT NoteCard.svelte. Canvas has access to the coordinate transform needed to convert viewport coordinates to canvas coordinates.

```typescript
// In the link click handler (Canvas.svelte)
function handleLinkClick(noteId: string, fromCardId: string, linkPosition: Point) {
    const fromCard = canvasStore.cards.get(fromCardId);
    if (!fromCard) return;

    // Convert viewport linkPosition to canvas coordinates using current transform
    const canvasLinkX = (linkPosition.x - transform.x) / transform.k;
    const cardCenterX = fromCard.position.x + (fromCard.dimensions?.width ?? 400) / 2;

    const linkSide: LinkSide = canvasLinkX < cardCenterX ? 'left' : 'right';

    canvasStore.openNote(noteId, fromCardId, linkPosition, linkSide);
}
```

#### Step 2.3: Thread linkSide Through Store

**File:** `src/lib/stores/canvas.svelte.ts`

```typescript
async openNote(
    noteId: string,
    fromCardId: string | null,
    linkPosition: Point | null,
    linkSide?: LinkSide  // NEW
): Promise<void> {
    // ... existing logic ...
    const position = calculateNewCardPosition(
        parentCard,
        existingCards,
        linkPosition,
        newCardDimensions,
        existingPaths,
        linkSide  // Pass through
    );
}
```

#### Step 2.4: Adjust Scoring in Layout

**File:** `src/lib/utils/layout.ts`

Add scoring constants (replace magic numbers):

```typescript
const SCORING = {
    COLUMN_PENALTY_PREFERRED: 0,
    COLUMN_PENALTY_ADJACENT: 100,
    COLUMN_PENALTY_OPPOSITE: 200,
    COLUMN_PENALTY_FAR: 300,
    Y_DISTANCE_WEIGHT: 0.5,
    CHANNEL_REUSE_PENALTY: 300,
} as const;
```

Update scoring logic (around line 260):

```typescript
function scoreCandidatePosition(
    // ... existing params ...
    linkSide?: LinkSide
): { score: number; pathCollisions: PathCollision[] } {
    // ...

    // Column preference based on link side
    const preferredColumn = linkSide === 'left'
        ? parentColumn - 1
        : parentColumn + 1;

    if (candidateColumn === preferredColumn) {
        score += SCORING.COLUMN_PENALTY_PREFERRED;  // 0
    } else if (Math.abs(candidateColumn - parentColumn) === 1) {
        score += SCORING.COLUMN_PENALTY_OPPOSITE;   // 200
    } else {
        score += SCORING.COLUMN_PENALTY_FAR;        // 300
    }
    // ...
}
```

**Acceptance Criteria:**
- [ ] Link on left side → card placed to left (when space available)
- [ ] Link on right side → card placed to right (current behavior)
- [ ] Falls back to other side if preferred side blocked
- [ ] No magic numbers in scoring logic

---

### Phase 3: Card Focus & Navigation (Implemented)

**Files modified:**
- `src/lib/stores/canvas.svelte.ts`
- `src/lib/components/Canvas.svelte`

#### Changes Made:

1. **savedCardState now stores focusPoint instead of camera**
   - Changed from `camera: Camera` to `focusPoint: Point`
   - focusPoint is in canvas coordinates, making it zoom-independent
   - When restoring, camera position is computed at current zoom level

2. **Two-click card focus behavior**
   - Added `focusCardWithoutAnimation()` - focuses without panning
   - Added `panToFocusedCard()` - pans already-focused card into view
   - Updated `handleCardClick()` to check if card is already focused

3. **animateToFocusPoint replaces animateToPosition**
   - Takes canvas-space focusPoint instead of camera coordinates
   - Computes target camera position at CURRENT zoom level
   - Never changes zoom during navigation

4. **Link following unchanged**
   - `followLinkToRight()` calls `focusCard()` which animates
   - This is the desired behavior: link follow = focus + pan

---

## Bugs to Fix (From Review)

These issues were identified during the plan review and should be addressed:

### P1: activeChain Can Have Duplicates

**File:** `src/lib/stores/canvas.svelte.ts`

The `pushToActiveChain()` method doesn't prevent duplicates, causing navigation issues.

**Fix:**
```typescript
private pushToActiveChain(cardId: string): void {
    // Prevent duplicates
    if (this.activeChain.includes(cardId)) {
        // Remove existing and re-add at end, or just return
        this.activeChain = this.activeChain.filter(id => id !== cardId);
    }
    this.activeChain = [...this.activeChain, cardId];
}
```

### P2: savedCardState Never Cleaned Up

**File:** `src/lib/stores/canvas.svelte.ts`

When cards are closed, their `savedCardState` entry is never removed, causing unbounded growth.

**Fix:** Add cleanup in `unopenCurrentCard()`:
```typescript
// In unopenCurrentCard(), after removing the card:
if (this.savedCardState.has(cardToUnopen)) {
    const newMap = new Map(this.savedCardState);
    newMap.delete(cardToUnopen);
    this.savedCardState = newMap;
}
```

---

## Removed from Plan

### ~~Phase 3: Root-Relative Chain Navigation~~ (YAGNI)

**Reason:** The proposed implementation had identical branches in the if/else—it was effectively dead code that did nothing. The current array-based navigation (ArrowLeft = back, ArrowRight = forward) already works correctly and matches browser semantics.

### ~~Phase 4: Visual Polish~~ (Premature)

**Reason:** Connection lines are currently disabled. Adding draw transitions before lines even work is premature optimization. Move to a follow-up task after Phase 1 ships.

---

## Technical Decisions

### Q1: Where to calculate linkSide?

**Decision:** Canvas.svelte, not NoteCard.svelte.

**Reason:** NoteCard uses `getBoundingClientRect()` which returns viewport coordinates. Canvas.svelte has access to the D3 transform needed to convert these to canvas coordinates. Mixing coordinate systems causes bugs on pan/zoom.

### Q2: What if preferred side is blocked?

**Decision:** The scoring algorithm handles this automatically. Blocked positions score higher (worse) due to overlap penalties, so the algorithm falls back to available space.

### Q3: Keep sequential or switch to spatial navigation?

**Decision:** Keep sequential (array-based) for v1.

**Reason:** ArrowLeft = back in chain, ArrowRight = forward matches browser semantics and user expectations. Spatial navigation (WASD) can be added later as an optional mode.

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/lib/types/index.ts` | Add `LinkSide` type |
| `src/lib/components/Canvas.svelte` | Uncomment lines, calculate linkSide, two-click focus, animateToFocusPoint |
| `src/lib/stores/canvas.svelte.ts` | Pass linkSide through, focusPoint storage, focusCardWithoutAnimation, panToFocusedCard |
| `src/lib/utils/layout.ts` | Add `SCORING` constants, add `linkSide` parameter |

---

## Testing Checklist

### Manual Testing
- [ ] Click link on left side → new card appears to left
- [ ] Click link on right side → new card appears to right
- [ ] Connection lines render from link underline to card edge
- [ ] ArrowLeft/ArrowRight navigate chain correctly
- [ ] Pan/zoom doesn't break link side detection
- [ ] Closing cards cleans up savedCardState

### Phase 3: Focus & Navigation Testing
- [ ] First click on unfocused card → focuses without panning
- [ ] Second click on focused card → pans to reading position
- [ ] Following a link → focuses AND pans in one action
- [ ] Zoom level unchanged when navigating between cards
- [ ] Reading position preserved when zoom changes (zoom in, navigate away, navigate back)
- [ ] Keyboard navigation (Arrow keys) still works

### Edge Cases
- [ ] Link exactly at card center → defaults to right
- [ ] No space on preferred side → falls back to other side
- [ ] Clicking same link twice → no duplicate in activeChain
- [ ] Reading position restored at different zoom levels

---

## Future Enhancements

1. **Visual polish** - Draw transitions for connection lines (after they're verified working)
2. **Spatial WASD navigation** - True directional movement
3. **Connection line interactions** - Hover to highlight, click to traverse
4. **Performance optimization** - Address O(n³) in `regenerateAllPathSvgs` if scaling past 50 connections

---

*Plan version: 3.0*
*Updated: 2026-01-16*
*Branch: feat/layout-and-connecting-lines*
*Review: Completed - Phase 3 (focus & navigation) implemented*
