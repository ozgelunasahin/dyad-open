# feat: Define Active Reading Area for Viewport Panning

## Overview

Define an "active area" within the viewport that represents the optimal reading/editing zone. This area:
- Determines **when** to pan (content outside triggers pan)
- Determines **how far** to pan (brings content just inside the boundary, not to center)
- Is **asymmetric** (different margins for left/right/top/bottom)
- Creates **gentle, minimal** panning behavior

## Problem Statement

Currently, the panning system uses:
- Fixed 50px margins for visibility checks (`getCardVisibility`)
- Fixed 100px margins for reading zone (`isCardInReadingZone`)
- Symmetric margins left/right
- Two different concepts (visibility vs reading zone) that should be unified

Issues:
1. Margins are symmetric but reading behavior isn't (we read left-to-right, need more space on right)
2. "Visibility" and "reading zone" are separate concepts that could be unified
3. Panning either does nothing or centers the card - no "gentle nudge" to bring content just inside the active area

## Proposed Solution

### UX Research Findings

Eye-tracking research from Nielsen Norman Group provides strong evidence for left-biased reading:

- **80% of viewing time** is spent on the left half of the screen (up from 69% in 2010)
- **Peak fixation** occurs around 400-600px from left edge
- **F-pattern scanning**: First words on left of each line receive most attention
- **24% faster reading** with left-aligned text vs centered
- **Gutenberg Diagram**: Primary Optical Area is top-left, with "reading gravity" flowing diagonally to bottom-right

**Key insight**: The active reading area should be **skewed toward the left** to match natural LTR reading behavior.

### Active Area Definition

```
┌──────────────────────────────────────────────────────┐
│                   top margin (15%)                    │
│  ┌──────────────────────────────────────────┐        │
│  │                                          │        │
│l │                                          │ r      │
│e │       ACTIVE READING AREA                │ i      │
│f │                                          │ g      │
│t │  (content should stay in here)           │ h      │
│  │                                          │ t      │
│( │  ← Left-biased for F-pattern reading     │        │
│5 │                                          │ (      │
│% │                                          │ 2      │
│) │                                          │ 0      │
│  │                                          │ %      │
│  └──────────────────────────────────────────┘ )      │
│                   bottom margin (10%)                 │
└──────────────────────────────────────────────────────┘
```

**Proposed margins (as percentages of viewport):**
- **Top:** 15% (reading starts near top, matches current animation target)
- **Bottom:** 10% (need less space below for reading)
- **Left:** 5% (minimal - keep content available near left edge where 80% of attention goes)
- **Right:** 20% (larger - users don't focus here; also leaves room for child cards)

**Rationale**: The asymmetry reflects the research finding that readers naturally focus on the left. A 5%/20% split means the active area is biased 75% toward the left, matching the ~80% left-side attention finding.

### Behavior

1. **When content is inside active area:** No panning
2. **When content is outside active area:** Pan the minimum amount to bring it just inside the boundary
3. **For new cards:** Still animate to preferred reading position (top at 15% line)
4. **For navigation between existing cards:** Use gentle nudge behavior

## Technical Approach

### 1. Define ActiveArea Type

```typescript
// src/lib/types.ts
interface ActiveArea {
  top: number;      // pixels from viewport top
  bottom: number;   // pixels from viewport bottom
  left: number;     // pixels from viewport left
  right: number;    // pixels from viewport right
}
```

### 2. Calculate Active Area from Viewport

```typescript
// src/lib/stores/canvas.svelte.ts
private calculateActiveArea(): ActiveArea {
  return {
    top: this.viewportHeight * 0.15,
    bottom: this.viewportHeight * 0.10,
    left: this.viewportWidth * 0.08,
    right: this.viewportWidth * 0.12
  };
}

// Computed bounds in canvas coordinates
private getActiveAreaBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
  const area = this.calculateActiveArea();
  const zoom = this.camera.zoom;
  return {
    minX: (-this.camera.x + area.left) / zoom,
    maxX: (-this.camera.x + this.viewportWidth - area.right) / zoom,
    minY: (-this.camera.y + area.top) / zoom,
    maxY: (-this.camera.y + this.viewportHeight - area.bottom) / zoom
  };
}
```

### 3. Unified Visibility Check

Replace `getCardVisibility()` with active area logic:

```typescript
getCardVisibility(cardId: string): VisibilityState {
  const card = this.cards.get(cardId);
  if (!card) return 'off-screen';

  const bounds = this.getActiveAreaBounds();
  const cardRight = card.position.x + card.dimensions.width;
  const cardBottom = card.position.y + card.dimensions.height;

  // Check if card overlaps with active area at all
  const anyOverlap = (
    cardRight > bounds.minX &&
    card.position.x < bounds.maxX &&
    cardBottom > bounds.minY &&
    card.position.y < bounds.maxY
  );

  if (!anyOverlap) return 'off-screen';

  // Check if card's "reading region" is fully inside active area
  // Reading region = card top + horizontal extent
  const horizontallyInside = card.position.x >= bounds.minX && cardRight <= bounds.maxX;
  const topInside = card.position.y >= bounds.minY || card.position.y < bounds.minY; // top scrolled past is OK

  if (horizontallyInside && topInside) return 'fully-visible';
  return 'partially-visible';
}
```

### 4. Gentle Nudge Panning

Replace `calculateMinimalPan()` with active area logic:

```typescript
calculateGentlePan(cardId: string): { dx: number; dy: number } | null {
  const card = this.cards.get(cardId);
  if (!card) return null;

  const area = this.calculateActiveArea();
  const zoom = this.camera.zoom;

  // Convert card bounds to screen coordinates
  const screenLeft = card.position.x * zoom + this.camera.x;
  const screenTop = card.position.y * zoom + this.camera.y;
  const screenRight = screenLeft + card.dimensions.width * zoom;
  const screenBottom = screenTop + card.dimensions.height * zoom;

  let dx = 0, dy = 0;

  // Horizontal: bring inside active area
  if (screenLeft < area.left) {
    dx = area.left - screenLeft;  // Pan right
  } else if (screenRight > this.viewportWidth - area.right) {
    dx = (this.viewportWidth - area.right) - screenRight;  // Pan left
  }

  // Vertical: bring top inside active area (allow bottom to extend)
  if (screenTop < area.top) {
    dy = area.top - screenTop;  // Pan down
  } else if (screenTop > this.viewportHeight - area.bottom) {
    // Card top is below active area
    dy = (this.viewportHeight - area.bottom) - screenTop;  // Pan up
  }

  return (dx === 0 && dy === 0) ? null : { dx, dy };
}
```

### 5. Update focusCard() Logic

```typescript
focusCard(cardId: string, forceAnimation: boolean = false): void {
  // ... existing setup ...

  const visibility = this.getCardVisibility(cardId);
  const savedState = this.savedCardState.get(cardId);

  // Decision tree:
  // 1. Force animation → full pan to reading position
  // 2. Has saved state → restore to saved position
  // 3. Fully inside active area → no pan
  // 4. Partially visible → gentle nudge into active area
  // 5. Off-screen → full pan to reading position

  if (forceAnimation) {
    // Full animation to reading position
  } else if (savedState?.focusY !== undefined) {
    // Restore to saved position
  } else if (visibility === 'fully-visible') {
    // No pan needed - content is in active area
    return;
  } else if (visibility === 'partially-visible') {
    const nudge = this.calculateGentlePan(cardId);
    if (nudge) {
      // Gentle animated nudge
      dispatchMinimalPanEvent(nudge.dx, nudge.dy);
    }
  } else {
    // Off-screen: full animation to reading position
  }
}
```

## Acceptance Criteria

- [ ] Define `ActiveArea` interface with asymmetric margins
- [ ] Implement `calculateActiveArea()` with percentage-based margins
- [ ] Implement `getActiveAreaBounds()` for canvas-coordinate conversion
- [ ] Update `getCardVisibility()` to use active area bounds
- [ ] Update `calculateMinimalPan()` → `calculateGentlePan()` to use active area
- [ ] Update `focusCard()` to use new gentle pan logic
- [ ] Update `isCardInReadingZone()` to use active area (or remove if redundant)
- [ ] Verify ArrowLeft/ArrowRight navigation uses gentle panning
- [ ] Verify clicking cards uses gentle panning
- [ ] Test with various zoom levels

## Files to Modify

1. **`src/lib/types.ts`** - Add `ActiveArea` interface
2. **`src/lib/stores/canvas.svelte.ts`** - Core implementation
   - Add `calculateActiveArea()`
   - Add `getActiveAreaBounds()`
   - Update `getCardVisibility()`
   - Update `calculateMinimalPan()` → `calculateGentlePan()`
   - Update `focusCard()`
   - Update or remove `isCardInReadingZone()`
3. **`src/lib/components/Canvas.svelte`** - Handle minimal pan animation (if not already)

## Testing Scenarios

1. **Card fully in active area** → No pan on focus
2. **Card left edge outside** → Pan right just enough
3. **Card right edge outside** → Pan left just enough
4. **Card top outside** → Pan down just enough
5. **Card fully off-screen** → Full animation to reading position
6. **Navigation with ArrowRight** → Gentle pan if needed
7. **Navigation with ArrowLeft** → Gentle pan if needed
8. **Various zoom levels** → Margins scale correctly

## References

### UX Research Sources
- [Nielsen Norman Group - Horizontal Attention Leans Left](https://www.nngroup.com/articles/horizontal-attention-leans-left/) - 80% viewing time on left half
- [Nielsen Norman Group - F-Shaped Pattern](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/) - F-pattern scanning behavior
- [Baymard Institute - Line Length Readability](https://baymard.com/blog/line-length-readability) - 50-75 characters optimal
- [CXL - How People View Websites](https://cxl.com/blog/10-useful-findings-about-how-people-view-websites/) - Eye tracking studies

### Existing Code
- Visibility logic: `src/lib/stores/canvas.svelte.ts:986-1039`
- Minimal pan: `src/lib/stores/canvas.svelte.ts:1046-1078`
- Focus card logic: `src/lib/stores/canvas.svelte.ts:608-733`
- Reading zone: `src/lib/stores/canvas.svelte.ts:933-974`
