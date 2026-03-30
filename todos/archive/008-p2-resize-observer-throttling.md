---
status: pending
priority: p2
id: "008"
tags: [code-review, performance, ui]
---

# ResizeObserver Without Throttling

## Problem Statement

The ResizeObserver in NoteCard can fire rapidly during animations or content changes, causing layout thrashing and unnecessary database persistence calls.

## Findings

### Performance Oracle Agent

**File**: `src/lib/components/NoteCard.svelte:350-364`

```typescript
const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
        const newHeight = entry.contentRect.height + 16;
        if (newHeight > card.dimensions.height) {
            canvasStore.updateCardHeight(card.id, newHeight);
        }
    }
});
```

Each callback triggers:
1. `canvasStore.updateCardHeight` (creates new Map, triggers reactivity)
2. `schedulePersist()` (debounced but still queues work)

**Impact**: With 20+ cards, rapid height changes cause noticeable UI lag.

## Proposed Solutions

### Option A: requestAnimationFrame Throttle
- **Description**: Only process height changes once per animation frame
- **Pros**: Simple, native browser API
- **Cons**: None
- **Effort**: Small
- **Risk**: Low

```typescript
let rafId: number;
const observer = new ResizeObserver((entries) => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
        for (const entry of entries) {
            const newHeight = entry.contentRect.height + 16;
            if (newHeight > card.dimensions.height) {
                canvasStore.updateCardHeight(card.id, newHeight);
            }
        }
    });
});
```

## Recommended Action

**Option A** - Add RAF throttle. Minimal change, significant improvement.

## Acceptance Criteria

- [ ] ResizeObserver callback throttled
- [ ] Card height updates still work correctly
- [ ] No layout thrashing during content changes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by performance-oracle agent |
