---
status: pending
priority: p3
id: "028"
tags: [code-review, simplicity, dry]
---

# Consolidate Repeated Code Patterns in Canvas

## Problem Statement

Canvas.svelte and canvas.svelte.ts contain repeated patterns that could be consolidated:

1. Connection path generation appears in multiple places
2. Card boundary calculations repeated
3. Coordinate transformation duplicated

## Findings

### Code Simplicity Review

Repeated patterns:

1. **Card center calculation** (appears 3+ times):
   ```typescript
   const centerX = card.position.x + card.dimensions.width / 2;
   const centerY = card.position.y + card.dimensions.height / 2;
   ```

2. **World-to-screen coordinate transform** (appears 2+ times):
   ```typescript
   const screenX = (worldX - camera.x) * camera.zoom;
   const screenY = (worldY - camera.y) * camera.zoom;
   ```

3. **Card bounds check** (appears 2+ times):
   ```typescript
   const left = card.position.x;
   const right = card.position.x + card.dimensions.width;
   const top = card.position.y;
   const bottom = card.position.y + card.dimensions.height;
   ```

## Proposed Solution

Extract small utility functions:

```typescript
// In types or utils
function cardCenter(card: Card): Point {
    return {
        x: card.position.x + card.dimensions.width / 2,
        y: card.position.y + card.dimensions.height / 2
    };
}

function cardBounds(card: Card): { left: number; right: number; top: number; bottom: number } {
    return {
        left: card.position.x,
        right: card.position.x + card.dimensions.width,
        top: card.position.y,
        bottom: card.position.y + card.dimensions.height
    };
}
```

## Technical Details

**Affected Files:**
- `src/lib/components/Canvas.svelte`
- `src/lib/stores/canvas.svelte.ts`
- `src/lib/utils/pathfinding.ts`

## Acceptance Criteria

- [ ] Card center calculation extracted to utility
- [ ] Card bounds calculation extracted to utility
- [ ] No repeated inline calculations
- [ ] All tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from code review | Small utilities reduce errors |

## Resources

- Code simplicity reviewer findings
