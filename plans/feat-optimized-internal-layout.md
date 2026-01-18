# Plan: Optimized Internal Layout with Dimension Caching

## Overview

Push toward a release optimized for internal editing and polished read mode. The key improvements focus on right-only layout, dimension caching for performance, and streamlined navigation with close-on-back behavior.

**Note**: This plan was revised after multi-agent review (see [Review Findings](#review-findings) below). The original forward planning approach was identified as over-engineering; the existing reactive layout algorithm is already sophisticated and sufficient.

## Goals

1. **Right-Moving Only Layout**: Cards always placed to the right of their parent (eliminate left-side fallback)
2. **Dimension Caching**: Pre-compute card dimensions at vault load for O(1) lookup during navigation
3. **Close-on-Back Navigation**: Default behavior when pressing Left/navigating back closes the current card; Ctrl+Left keeps it open

## Architecture Analysis

### Current State

**Layout Algorithm** (`src/lib/utils/layout.ts`):
- Multi-candidate scoring system with columns and Y offsets
- Left-side placement exists as fallback (lines 132-138, 145-150)
- `LEFT_SIDE_PENALTY: 150` - penalty exists but left is still possible
- Scoring includes coaxial overlap, crossings, Y distance, channel reuse
- **Already handles overlaps reactively** via `hasOverlap()` function

**Navigation** (`src/lib/stores/canvas.svelte.ts`):
- `navigateLeftInChain()` / `navigateRightInChain()` - move focus along chain
- `unopenCurrentCard()` - removes card from view (doesn't delete data)
- `followLinkToRight()` - opens link and truncates chain after current position
- No modifier key handling for navigation variants

**Card Dimensions** (`src/lib/utils/json-content.ts`):
- `calculateOptimalWidthFromJson()` - variable width based on content (6 tree traversals per call)
- `estimateContentHeight()` - height estimation (1 additional traversal)
- Currently recalculated on every card open - no caching

**Keyboard Handling** (`src/routes/canvas/[canvasId]/+page.svelte`):
- Arrow key navigation exists
- No Ctrl modifier variants implemented

## Implementation Plan

### Phase 1: Right-Only Layout

**File: `src/lib/utils/layout.ts`**

1. Remove left-side columns from candidates:
   ```typescript
   // Change from:
   const columnsToTry = [
     parentColumn + 1,
     parentColumn + 2,
     parentColumn - 1,  // Remove
     parentColumn - 2,  // Remove
     parentColumn + 3
   ];
   // To:
   const columnsToTry = [
     parentColumn + 1,
     parentColumn + 2,
     parentColumn + 3,
     parentColumn + 4  // More right options instead
   ];
   ```

2. Remove `LEFT_SIDE_PENALTY` scoring logic (lines 289-301)
3. Remove left-side gap calculation (lines 147-150)
4. Remove `isLeftSide` variable and related conditionals

**Expected Impact**: Cards will only ever appear to the right of their parent, creating a cleaner left-to-right reading flow.

### Phase 2: Dimension Caching

Pre-compute card dimensions at vault initialization for O(1) lookup during navigation.

**File: `src/lib/stores/canvas.svelte.ts`**

1. Add dimension cache:
   ```typescript
   // Add to class properties
   private dimensionCache = $state<Map<string, Dimensions>>(new Map());
   ```

2. Pre-compute dimensions during initialization:
   ```typescript
   async initialize(vault: Vault, canvasId?: string, savedPositions?: SavedPosition[]): Promise<void> {
     // ... existing initialization code ...

     // Pre-compute dimensions for all notes (~15ms for 35 notes)
     const newCache = new Map<string, Dimensions>();
     for (const [noteId, note] of Object.entries(vault.notes)) {
       const width = calculateOptimalWidthFromJson(note.content, MIN_CARD_WIDTH, MAX_CARD_WIDTH);
       const height = estimateContentHeight(note.content, width);
       newCache.set(noteId, { width, height: Math.max(100, height) });
     }
     this.dimensionCache = newCache;

     // ... rest of initialization ...
   }
   ```

3. Use cached dimensions in `calculateCardDimensions()`:
   ```typescript
   private calculateCardDimensions(content: JSONContent, noteId?: string): Dimensions {
     // Use cache if available
     if (noteId && this.dimensionCache.has(noteId)) {
       return this.dimensionCache.get(noteId)!;
     }

     // Fallback to calculation (for dynamically created notes)
     const width = calculateOptimalWidthFromJson(content, MIN_CARD_WIDTH, MAX_CARD_WIDTH);
     const height = estimateContentHeight(content, width);
     const dimensions = { width, height: Math.max(100, height) };

     // Cache the result
     if (noteId) {
       const newCache = new Map(this.dimensionCache);
       newCache.set(noteId, dimensions);
       this.dimensionCache = newCache;
     }

     return dimensions;
   }
   ```

4. Invalidate cache on content update:
   ```typescript
   updateNoteContent(noteId: string, content: JSONContent): void {
     // ... existing code ...

     // Invalidate dimension cache for this note
     if (this.dimensionCache.has(noteId)) {
       const newCache = new Map(this.dimensionCache);
       newCache.delete(noteId);
       this.dimensionCache = newCache;
     }
   }
   ```

**Expected Impact**:
- Eliminates 7 tree traversals per card open (significant for notes with many links)
- O(1) dimension lookup instead of O(n) calculation
- One-time ~15ms cost at vault load (acceptable)

### Phase 3: Close-on-Back Navigation

**File: `src/lib/stores/canvas.svelte.ts`**

1. Modify `navigateLeftInChain()` to accept keepOpen parameter:
   ```typescript
   /**
    * Navigate left in chain with optional close behavior.
    * @param keepOpen - If true, don't close the current card (Ctrl+Left behavior)
    */
   navigateLeftInChain(keepOpen: boolean = false): boolean {
     if (!this.focusedCardId) return false;

     const currentIndex = this.activeChain.indexOf(this.focusedCardId);
     if (currentIndex <= 0) return false;

     const targetCardId = this.activeChain[currentIndex - 1];

     // Default behavior: close the card we're leaving
     if (!keepOpen) {
       this.unopenCurrentCard();
     }

     this.focusCard(targetCardId);
     return true;
   }
   ```

**File: `src/routes/canvas/[canvasId]/+page.svelte`**

2. Update keyboard handler:
   ```typescript
   function handleKeyDown(event: KeyboardEvent) {
     // ... existing code ...

     if (event.key === 'ArrowLeft') {
       event.preventDefault();
       const keepOpen = event.ctrlKey || event.metaKey;
       canvasStore.navigateLeftInChain(keepOpen);
       return;
     }

     // ... rest of handler ...
   }
   ```

**Expected Impact**: Cleaner navigation - going back naturally closes cards (Miller Columns pattern), while Ctrl+Left allows keeping cards open for comparison.

## File Summary

| File | Changes |
|------|---------|
| `src/lib/utils/layout.ts` | Remove left-side candidates and scoring (~20 lines removed) |
| `src/lib/stores/canvas.svelte.ts` | Add dimension cache, modify navigation (~40 lines added) |
| `src/routes/canvas/[canvasId]/+page.svelte` | Add Ctrl+Left modifier handling (~5 lines changed) |

## Testing Strategy

1. **Layout Tests**:
   - Open multiple linked notes - all should appear to the right
   - No cards should ever appear to the left of their parent
   - Verify no overlapping cards (reactive algorithm still works)

2. **Dimension Cache Tests**:
   - First card open should use cached dimensions (no calculation)
   - Edit a note's content - next open should recalculate
   - Create new note via broken link - should calculate and cache

3. **Navigation Tests**:
   - Left arrow: closes current card, focuses parent
   - Ctrl+Left: keeps current card open, focuses parent
   - Right arrow: focuses child (no change)
   - Verify history still works correctly

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Right-only layout may cause vertical stacking | Increase Y offset range in candidates |
| Cache memory overhead | ~50 bytes per note, negligible even at 500 notes |
| Stale cache after content edit | Invalidate on `updateNoteContent()` |
| Close-on-back unexpected for users | Document behavior, Ctrl variant clear |

---

## Review Findings

This plan was reviewed by specialized agents on 2026-01-18. The original plan included a full "Forward Planning" phase that was identified as over-engineering.

### Original Proposal (Rejected)

The original Phase 3 proposed creating a new `forward-planning.ts` module with:
- `ForwardPlan` interface with `columnOccupancy` tracking
- `buildForwardPlan()` function with depth-5 tree traversal
- `getPlannedPosition()` lookup function
- Storing forward plan state in canvas store
- Regenerating plan on each note open

### Why Forward Planning Was Rejected

| Agent | Finding |
|-------|---------|
| **Architecture Strategist** | Forward planning adds complexity but the benefit is marginal. The real opportunity is dimension caching, not position pre-calculation. |
| **Performance Oracle** | Dimension calculation is expensive (6-7 tree traversals per note). Pre-computing with depth-5 would mean 50+ notes × 7 traversals = 350+ traversals per link click. Unacceptable. |
| **Pattern Specialist** | If variable heights become a problem, van der Ploeg's contour algorithm is the right solution - but the current reactive `hasOverlap()` is sufficient for now. |
| **Simplicity Reviewer** | "Forward planning is over-engineering. The current 445-line layout algorithm already generates ~100+ candidates and scores them. Just remove the 4 lines that allow left-side placement." |

### Key Insights

1. **The reactive algorithm already works well**: The current multi-candidate scoring system in `layout.ts` handles overlaps, coaxial line detection, and channel assignment effectively.

2. **The real opportunity is dimension caching**: Not calculating positions ahead of time, but caching the dimension calculations that are currently repeated on every card open.

3. **YAGNI applies**: Users rarely traverse 5+ links deep. Most linked notes are never clicked. Pre-calculating positions for the entire subtree is speculative work.

4. **Simpler is better**: Removing left-side placement (~15 lines) achieves the "right-moving only" goal without any new modules.

### Future Considerations

If layout issues arise later, the agents recommended:

1. **Tiered approach**: Calculate precise dimensions for immediate children only; use heuristics for deeper levels
2. **Hover-triggered pre-calculation**: Calculate position on link hover (~300ms latency hiding)
3. **Van der Ploeg algorithm**: For handling variable card heights with contour-based sibling spacing (only if overlap becomes a real problem)

### Sources from Review

- [d3-flextree](https://github.com/Klortho/d3-flextree) - Variable node size tree layouts
- [van der Ploeg paper](https://ir.cwi.nl/pub/21856) - "Drawing non-layered tidy trees in linear time"
- [High-performance tidy trees](https://www.zxch3n.com/tidy/tidy/) - Partial relayout optimization
