---
status: pending
priority: p2
id: "004"
tags: [code-review, performance, memory-leak]
---

# Memory Leak: Animation Frames Not Cancelled on Unmount

## Problem Statement

The `animateToCenter()` and `animateToPosition()` functions use `requestAnimationFrame` loops without cancellation. If Canvas unmounts mid-animation, the loop continues with stale references.

## Findings

**Source:** Performance Oracle, Julik Frontend Races Reviewer

**Evidence:**
- `src/lib/components/Canvas.svelte` lines 255-296, 301-336
- No `cancelAnimationFrame()` call
- Animation continues accessing potentially null SVG element

## Proposed Solutions

### Option A: Cancellation token pattern (Recommended)
- **Pros:** Clean, simple
- **Cons:** Requires tracking state
- **Effort:** Small (30 minutes)
- **Risk:** Low

```typescript
let animationCancelled = false;

function animateToCenter(targetX: number, targetY: number) {
    animationCancelled = false;

    function animate() {
        if (animationCancelled) return;
        // ... animation logic
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    requestAnimationFrame(animate);
}

// In cleanup
return () => {
    animationCancelled = true;
    // ... other cleanup
};
```

### Option B: Track frame ID
- **Pros:** Can cancel specific animation
- **Cons:** More state management
- **Effort:** Small
- **Risk:** Low

```typescript
let animationFrameId: number | null = null;

// In cleanup
if (animationFrameId) cancelAnimationFrame(animationFrameId);
```

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/lib/components/Canvas.svelte`

### Components
- Canvas animation system

## Acceptance Criteria

- [ ] Animation stops when component unmounts
- [ ] No console errors during rapid navigation
- [ ] Memory profile shows no leaked frames

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by performance-oracle agent |
| 2026-01-15 | Fixed | Added animationCancelled flag + cleanup in onMount return |

## Resources

- Test by rapidly navigating between cards during animation
