---
status: complete
priority: p2
issue_id: "035"
tags: [code-review, race-condition, canvas-improvements]
dependencies: []
---

# Navigation Race Conditions (Rapid ArrowLeft/Right)

## Problem Statement

Rapid navigation can cause state inconsistency. `navigateLeftInChain()` closes cards and triggers animations without guards against concurrent invocations. Multiple `requestAnimationFrame` callbacks queue up, and `regenerateAllPathSvgs()` can read/write store state concurrently.

## Findings

**From Race Condition Reviewer:**

1. **navigateLeftInChain + focusCard race**: `focusCard()` dispatches events starting 400ms animations while `unopenCard()` dispatches path computation events. Rapid ArrowLeft causes:
   - Multiple animation starts (only old one cancelled)
   - Store mutations during iteration
   - Jittery camera, flashing cards

2. **Multiple requestAnimationFrame queuing**: The pattern appears 7+ times:
   ```typescript
   requestAnimationFrame(() => {
       window.dispatchEvent(new CustomEvent('canvas-compute-paths'));
   });
   ```
   Multiple calls in same frame queue multiple events.

3. **regenerateAllPathSvgs concurrent access**: Reads `canvasStore.connections` while it may be modified by other operations.

**How to reproduce:**
- Hold ArrowLeft with 5+ cards open
- Watch for jittery animation and stale connection lines

## Proposed Solutions

### Option A: Navigation State Machine (Recommended)
Add state to prevent concurrent navigation.

```typescript
private navState: 'idle' | 'closing' | 'animating' = 'idle';

navigateLeftInChain(): boolean {
    if (this.navState !== 'idle') return false;
    this.navState = 'closing';
    // ... close cards
    this.navState = 'animating';
    this.focusCard(targetCardId);
    // Animation callback sets navState = 'idle'
}
```

**Pros:** Clear state machine, prevents all concurrent nav
**Cons:** Slightly more complex
**Effort:** Medium (2 hours)
**Risk:** Low

### Option B: Debounce Path Computation
Deduplicate the event dispatch.

```typescript
private pathComputationRequested = false;

requestPathComputation(): void {
    if (this.pathComputationRequested) return;
    this.pathComputationRequested = true;
    requestAnimationFrame(() => {
        this.pathComputationRequested = false;
        window.dispatchEvent(new CustomEvent('canvas-compute-paths'));
    });
}
```

**Pros:** Simple, addresses symptom
**Cons:** Doesn't fix root cause
**Effort:** Small (30 min)
**Risk:** Low

## Technical Details

**Files to modify:**
- `src/lib/stores/canvas.svelte.ts`: Add navigation state, refactor event dispatch
- `src/lib/components/Canvas.svelte`: Add guard in `regenerateAllPathSvgs()`

## Acceptance Criteria

- [ ] Rapid ArrowLeft produces smooth single animation
- [ ] No jittery camera movement
- [ ] Connection lines update cleanly after navigation
- [ ] Console shows single path computation per navigation

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-18 | Created from code review | |

## Resources

- PR Branch: feat/canvas-improvements
