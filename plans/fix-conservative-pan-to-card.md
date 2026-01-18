# fix: Conservative Pan-to-Card Behavior

## Overview

Make canvas pan-to-card behavior more conservative and calm. Currently, the canvas pans on every focus change regardless of whether the target card is already visible, creating a frenetic navigation experience. The goal is to pan only when necessary, pan minimally when possible, and make the overall experience calmer.

## Problem Statement

**Current Behavior (Problems):**
1. Double-click on card **always** pans to "reading position" even if card is already visible
2. Following a link **always** animates to center the new card
3. Chain navigation (arrow keys) **always** pans regardless of visibility
4. Too many pans happening, making navigation feel frenetic
5. Sometimes pans to unusual positions or puts cards partially off-screen

**Root Cause:**
- `focusCard()` always dispatches animation events without checking visibility
- `panToFocusedCard()` always triggers animation on second click
- No visibility detection algorithm exists in the codebase
- `isCardInReadingZone()` exists but is only used for *clearing* saved state, not preventing pans

## Proposed Solution

Implement a three-tier visibility check before any pan operation:

| Visibility State | Action | Animation |
|-----------------|--------|-----------|
| **Fully visible** (with margin) | Just change focus | None |
| **Partially visible** | Minimal pan to show card | Short (250ms) |
| **Off-screen** | Pan to reading position | Normal (400ms) |

### Key Changes

1. Add `getCardVisibility()` function to detect card visibility state
2. Add `calculateMinimalPan()` for partially visible cards
3. Modify `focusCard()` to check visibility before animating
4. Modify `panToFocusedCard()` to skip pan if already at reading position
5. Add new animation mode for minimal pans

## Technical Approach

### 1. Visibility Detection Algorithm

**File:** `src/lib/stores/canvas.svelte.ts`

```typescript
type VisibilityState = 'fully-visible' | 'partially-visible' | 'off-screen';

/**
 * Determine card visibility state relative to viewport.
 * Uses 50px margin for "fully visible" check.
 */
getCardVisibility(cardId: string): VisibilityState {
    const card = this.cards.get(cardId);
    if (!card) return 'off-screen';

    const margin = 50;
    const zoom = this.camera.zoom;

    // Convert card bounds to screen coordinates
    const screenLeft = card.position.x * zoom + this.camera.x;
    const screenTop = card.position.y * zoom + this.camera.y;
    const screenRight = screenLeft + card.dimensions.width * zoom;
    const screenBottom = screenTop + card.dimensions.height * zoom;

    // Viewport bounds with margin
    const viewLeft = margin;
    const viewTop = margin;
    const viewRight = this.viewportWidth - margin;
    const viewBottom = this.viewportHeight - margin;

    // Check if fully within viewport (with margin)
    const fullyVisible = (
        screenLeft >= viewLeft &&
        screenTop >= viewTop &&
        screenRight <= viewRight &&
        screenBottom <= viewBottom
    );

    if (fullyVisible) return 'fully-visible';

    // Check if any overlap with viewport (no margin for this check)
    const anyOverlap = (
        screenRight > 0 &&
        screenLeft < this.viewportWidth &&
        screenBottom > 0 &&
        screenTop < this.viewportHeight
    );

    return anyOverlap ? 'partially-visible' : 'off-screen';
}
```

### 2. Minimal Pan Calculation

**File:** `src/lib/stores/canvas.svelte.ts`

```typescript
/**
 * Calculate the smallest camera translation to make card fully visible.
 * Returns null if card is already fully visible.
 */
calculateMinimalPan(cardId: string): { dx: number; dy: number } | null {
    const card = this.cards.get(cardId);
    if (!card) return null;

    const margin = 50;
    const zoom = this.camera.zoom;

    // Convert card bounds to screen coordinates
    const screenLeft = card.position.x * zoom + this.camera.x;
    const screenTop = card.position.y * zoom + this.camera.y;
    const screenRight = screenLeft + card.dimensions.width * zoom;
    const screenBottom = screenTop + card.dimensions.height * zoom;

    let dx = 0;
    let dy = 0;

    // Calculate horizontal adjustment
    if (screenLeft < margin) {
        dx = margin - screenLeft;  // Pan right to show left edge
    } else if (screenRight > this.viewportWidth - margin) {
        dx = (this.viewportWidth - margin) - screenRight;  // Pan left to show right edge
    }

    // Calculate vertical adjustment
    if (screenTop < margin) {
        dy = margin - screenTop;  // Pan down to show top edge
    } else if (screenBottom > this.viewportHeight - margin) {
        dy = (this.viewportHeight - margin) - screenBottom;  // Pan up to show bottom edge
    }

    return (dx === 0 && dy === 0) ? null : { dx, dy };
}
```

### 3. Modified focusCard() Logic

**File:** `src/lib/stores/canvas.svelte.ts` (around line 548)

```typescript
focusCard(cardId: string, forceAnimation: boolean = false): void {
    const card = this.cards.get(cardId);
    if (!card) return;

    // Save current card's reading state before switching
    if (this.focusedCardId && this.focusedCardId !== cardId) {
        this.saveCurrentCardState();
    }

    const visibility = this.getCardVisibility(cardId);

    if (!forceAnimation && visibility === 'fully-visible') {
        // Card is fully visible - just update focus, no pan
        this.focusedCardId = cardId;
        // Dispatch event for any listeners that need to know focus changed
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('canvas-focus-instant', {
                detail: { cardId }
            }));
        }
        return;
    }

    if (!forceAnimation && visibility === 'partially-visible') {
        // Card is partially visible - minimal pan
        const minPan = this.calculateMinimalPan(cardId);
        if (minPan) {
            this.focusedCardId = cardId;
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('canvas-minimal-pan', {
                    detail: { cardId, dx: minPan.dx, dy: minPan.dy }
                }));
            }
            return;
        }
    }

    // Card is off-screen or force animation requested - existing behavior
    // ... rest of existing focusCard implementation
}
```

### 4. New Animation Handler for Minimal Pan

**File:** `src/lib/components/Canvas.svelte`

```typescript
function handleMinimalPan(event: CustomEvent<{ cardId: string; dx: number; dy: number }>) {
    const { dx, dy } = event.detail;
    const duration = 250;  // Shorter than full pan

    const startX = transform.x;
    const startY = transform.y;
    const endX = transform.x + dx;
    const endY = transform.y + dy;
    const zoomLevel = transform.k;

    const startTime = performance.now();

    function animate() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - (1 - progress) * (1 - progress);  // Ease out quad

        const currentX = startX + (endX - startX) * eased;
        const currentY = startY + (endY - startY) * eased;

        const newTransform = zoomIdentity.translate(currentX, currentY).scale(zoomLevel);
        selection.call(zoomBehavior.transform, newTransform);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);
}

// Add event listener in onMount
window.addEventListener('canvas-minimal-pan', handleMinimalPan as EventListener);
```

### 5. Modified panToFocusedCard() Logic

**File:** `src/lib/stores/canvas.svelte.ts` (around line 659)

```typescript
panToFocusedCard(): void {
    const card = this.focusedCardId ? this.cards.get(this.focusedCardId) : null;
    if (!card) return;

    // Check if card is already at or near reading position
    const visibility = this.getCardVisibility(this.focusedCardId!);

    if (visibility === 'fully-visible') {
        // Check if it's also near the ideal reading position
        const zoom = this.camera.zoom;
        const screenTop = card.position.y * zoom + this.camera.y;
        const idealTop = this.viewportHeight * 0.15;

        // If within 100px of ideal reading position, don't pan
        if (Math.abs(screenTop - idealTop) < 100) {
            return;  // Already at reading position, no pan needed
        }
    }

    // Otherwise, pan to reading position (existing behavior)
    // ... rest of existing implementation
}
```

## Acceptance Criteria

### Functional Requirements
- [ ] Clicking a fully visible card changes focus without panning
- [ ] Clicking a partially visible card pans minimally to show it fully
- [ ] Clicking an off-screen card pans to center it (existing behavior)
- [ ] Following a link to a visible card doesn't pan
- [ ] Following a link to an off-screen card pans to show it
- [ ] Chain navigation (arrow keys) checks visibility before panning
- [ ] Second click on focused card only pans if not at reading position
- [ ] All panning preserves current zoom level

### Non-Functional Requirements
- [ ] Visibility calculations are fast enough (<1ms) to not add latency
- [ ] Minimal pan animation is smooth (250ms, ease-out-quad)
- [ ] No visual glitches when skipping pan

### Quality Gates
- [ ] Manual testing of all navigation scenarios
- [ ] No regressions in existing functionality
- [ ] Works correctly at different zoom levels

## Implementation Phases

### Phase 1: Visibility Detection
1. Add `getCardVisibility()` method to canvas store
2. Add `calculateMinimalPan()` method to canvas store
3. Write unit tests for visibility detection

**Files to modify:**
- `src/lib/stores/canvas.svelte.ts`: Add visibility methods

### Phase 2: Focus Logic Changes
1. Modify `focusCard()` to check visibility before animating
2. Add new event types for instant focus and minimal pan
3. Update Canvas component to handle new events

**Files to modify:**
- `src/lib/stores/canvas.svelte.ts`: Modify focusCard()
- `src/lib/components/Canvas.svelte`: Add event handlers

### Phase 3: Second-Click Behavior
1. Modify `panToFocusedCard()` to check reading position
2. Add reading position proximity check

**Files to modify:**
- `src/lib/stores/canvas.svelte.ts`: Modify panToFocusedCard()

### Phase 4: Polish & Testing
1. Test all navigation scenarios
2. Fine-tune margin values and animation durations
3. Handle edge cases (tall cards, zoom extremes)

## Edge Cases to Handle

| Edge Case | Handling |
|-----------|----------|
| Card taller than viewport | Consider "fully visible" if top is at reading position |
| Card wider than viewport | Center horizontally, consider partially visible |
| Zoom level < 0.5 | Use screen-space margins, not canvas-space |
| Zoom level > 2.0 | Same handling, but card may not fit |
| Rapid clicking | Use existing animation cancellation flag |
| Viewport resize during animation | Let animation complete, recalculate on next action |

## Design Decisions

### Margin Values
- **Fully visible margin:** 50px on all sides
- **Reading position tolerance:** 100px vertical distance from ideal

### Animation Durations
- **No animation (instant focus):** 0ms
- **Minimal pan:** 250ms
- **Full pan to center:** 400ms (existing)
- **Restore saved position:** 300ms (existing)

### Visibility Priority
When a card is taller than the viewport, prioritize showing the top of the card (reading position) rather than centering it.

## References

### Internal References
- `src/lib/stores/canvas.svelte.ts:548-618` - Current focusCard() implementation
- `src/lib/stores/canvas.svelte.ts:659-693` - Current panToFocusedCard() implementation
- `src/lib/stores/canvas.svelte.ts:798-828` - Existing isCardInReadingZone() (reference)
- `src/lib/components/Canvas.svelte:591-642` - Current animateToCenter()
- `src/lib/components/Canvas.svelte:649-701` - Current animateToFocusPoint()

### Best Practices Applied
- "Pan only if needed" pattern (similar to `scrollIntoViewIfNeeded()`)
- Preserve zoom level during navigation
- Ease-out-quad for smooth deceleration
- Capture state at animation start to prevent race conditions

### Related Todos
- `todos/038-pending-p2-edit-save-navigation-race.md` - Related navigation race condition
