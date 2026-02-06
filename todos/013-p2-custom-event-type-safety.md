---
status: pending
priority: p2
id: "013"
tags: [code-review, typescript, architecture]
---

# Architecture: CustomEvent Communication Lacks Type Safety

## Problem Statement

Window events for store-to-component communication use type assertions without validation. If wrong event type is dispatched, it fails silently.

## Findings

**Source:** Architecture Strategist, TypeScript Reviewer

**Evidence:**
- `src/lib/stores/canvas.svelte.ts` lines 313, 320, etc.: Dispatches CustomEvents
- `src/lib/components/Canvas.svelte` lines 151-152: Unsafe cast

```typescript
const handleFocusAnimation = (event: Event) => {
    const customEvent = event as CustomEvent<{ x: number; y: number; cardId: string }>;
    // ...
};
```

## Proposed Solutions

### Option A: Add type guards (Recommended)
- **Pros:** Runtime safety, TypeScript-friendly
- **Cons:** More code
- **Effort:** Small (1 hour)
- **Risk:** Low

```typescript
// src/lib/utils/typeGuards.ts
export function isCanvasFocusEvent(
    event: Event
): event is CustomEvent<{ x: number; y: number; cardId: string }> {
    return event instanceof CustomEvent &&
           typeof event.detail?.x === 'number' &&
           typeof event.detail?.y === 'number';
}

// In Canvas.svelte
const handleFocusAnimation = (event: Event) => {
    if (!isCanvasFocusEvent(event)) return;
    animateToCenter(event.detail.x, event.detail.y);
};
```

### Option B: Declare global event map
- **Pros:** TypeScript knows event types
- **Cons:** Requires declaration merging
- **Effort:** Small
- **Risk:** Low

```typescript
// src/app.d.ts
declare global {
    interface WindowEventMap {
        'canvas-focus': CustomEvent<{ x: number; y: number; cardId: string }>;
        'canvas-zoom-to-fit': CustomEvent<void>;
    }
}
```

### Option C: Replace with callbacks/context
- **Pros:** No events needed, simpler
- **Cons:** Requires refactoring
- **Effort:** Medium
- **Risk:** Medium

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/lib/stores/canvas.svelte.ts`
- `src/lib/components/Canvas.svelte`
- New: `src/lib/utils/typeGuards.ts` or `src/app.d.ts`

### Components
- Canvas store
- Canvas component

## Acceptance Criteria

- [ ] All custom events have proper types
- [ ] Type guards validate event payloads
- [ ] No unsafe type assertions for events

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by architecture-strategist agent |

## Resources

- Consider using TypeScript declaration merging for WindowEventMap
