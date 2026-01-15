---
status: complete
priority: p2
issue_id: "011"
tags: [code-review, performance]
dependencies: []
---

# Performance: ResizeObserver Fires Excessively During Editing

## Problem Statement

Every content change triggers the ResizeObserver callback. `canvasStore.updateCardHeight()` creates a new Map instance each time, causing high GC pressure during typing.

## Findings

**Source:** Performance Oracle

**Evidence:**
- `src/lib/components/NoteCard.svelte` lines 336-350
- ResizeObserver callback fires on every height change
- `updateCardHeight()` in canvas.svelte.ts creates new Map on each call

## Proposed Solutions

### Option A: Throttle with requestAnimationFrame (Recommended)
- **Pros:** Coalesces rapid updates
- **Cons:** Slight delay in height updates
- **Effort:** Small (30 minutes)
- **Risk:** Low

```typescript
$effect(() => {
    if (!contentEl) return;

    let rafId: number | null = null;
    let lastHeight = card.dimensions.height;

    const observer = new ResizeObserver((entries) => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            rafId = null;
            const entry = entries[0];
            const newHeight = entry.contentRect.height + 16;
            if (newHeight > lastHeight + 5) {  // Only update if significant change
                lastHeight = newHeight;
                canvasStore.updateCardHeight(card.id, newHeight);
            }
        });
    });

    observer.observe(contentEl);
    return () => {
        if (rafId) cancelAnimationFrame(rafId);
        observer.disconnect();
    };
});
```

### Option B: Debounce height updates
- **Pros:** Simple
- **Cons:** Delayed visual feedback
- **Effort:** Small
- **Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/lib/components/NoteCard.svelte`
- `src/lib/stores/canvas.svelte.ts`

### Components
- NoteCard resize behavior
- Canvas store

## Acceptance Criteria

- [ ] Smooth typing without frame drops
- [ ] Card still expands as content grows
- [ ] Memory profile shows reduced GC during editing

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by performance-oracle agent |
| 2026-01-15 | Fixed | Throttled with rAF + 5px threshold for significant changes |

## Resources

- Test by profiling memory during rapid typing
