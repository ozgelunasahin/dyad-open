---
title: "Paginated Canvas Sections: Scroll & Lifecycle Integration"
category: integration-issues
component: SiteSPA, Canvas, canvasStore
tags: [d3-zoom, scroll-snap, svelte5, canvas-lifecycle, singleton-pattern]
severity: medium
date_solved: 2025-02-06
symptoms:
  - Canvas sections capture wheel events and trap user scroll
  - Scroll-snap bounces back when canvas section has snap-align none
  - Canvas view resets when scrolling away and back
  - Layout shifts during canvas mount/unmount transitions
  - Click-to-interact overlay removed from DOM before window click handler runs
root_cause: >
  Multiple interacting systems (d3-zoom wheel capture, CSS scroll-snap,
  canvas singleton lifecycle, Svelte reactive DOM updates) created cascading
  conflicts when embedding interactive canvas sections in a scrollable SPA.
---

# Paginated Canvas Sections: Scroll & Lifecycle Integration

## Problem

Embedding interactive d3-zoom canvas sections inside a scrollable SPA page creates conflicts at every layer:

1. **Wheel capture**: d3-zoom's `handleWheel` calls `preventDefault()` + `stopPropagation()`, trapping the user inside the canvas when they try to scroll past it.
2. **Scroll-snap bounce**: Setting `scroll-snap-align: none` on the active canvas section (to prevent snap from fighting pan/zoom) removes its snap point, causing the container to snap to adjacent sections — bouncing the user away.
3. **State loss on scroll-away**: Canvas unmounts when scrolled away, losing camera position and card state.
4. **Layout shifts**: Swapping between placeholder and canvas-frame elements causes visible size jumps during transitions.
5. **DOM detachment race**: A click-to-interact overlay removed by Svelte before the window click handler bubbles causes immediate exit from interaction mode.

## Solution

### 1. Suspend/Resume for Canvas Singleton

The `canvasStore` is a singleton — only one `<Canvas>` can be mounted. Rather than re-initializing on every scroll-back (~15-120ms), snapshot and restore state (~1ms):

```typescript
// canvasStore
interface SuspendedCanvas {
  cards: Map<string, Card>;
  connections: Connection[];
  camera: Camera;
  // ... all state fields
}

suspend(): void {
  this.suspendedState.set(this.currentCanvasId, { /* snapshot */ });
  this.teardown(); // clear without API calls
}

resume(canvasId: string): boolean {
  const snapshot = this.suspendedState.get(canvasId);
  if (!snapshot) return false;
  this.initGeneration++;
  // restore all state from snapshot
  return true;
}
```

Used in SiteSPA:
```typescript
async function activateCanvas(sectionId: string) {
  if (activeCanvasSection !== sectionId) canvasStore.suspend();
  activeCanvasSection = sectionId;
  const resumed = canvasStore.resume(canvasStoreId);
  if (!resumed) canvasStore.initialize(section.vault, canvasStoreId, positions);
}
```

### 2. `captureWheel` Prop — Let Wheel Events Pass Through

Instead of complex boundary detection or click-to-interact modes, disable wheel capture entirely for the SPA context:

```typescript
// Canvas.svelte
interface Props {
  readOnly?: boolean;
  interactive?: boolean;
  captureWheel?: boolean; // default true
  onBoundaryExit?: (direction: 'up' | 'down') => void;
}

function handleWheel(event: WheelEvent) {
  if (!interactive || !captureWheel) return; // pass through to page scroll
  // ... vertical panning + boundary detection (editor only)
}
```

```svelte
<!-- SiteSPA: natural page scroll, drag-pan + ctrl+wheel zoom still work -->
<Canvas readOnly captureWheel={false} />
```

### 3. Remove Scroll-Snap Entirely

Scroll-snap created more problems than it solved when combined with interactive canvas:
- Bounce-back when canvas section lost its snap-align
- Fighting with programmatic scroll during canvas activation
- Required complex JS to toggle `scrollSnapType` on/off

Just remove it. Standard overflow scroll works fine.

### 4. Absolute Overlay for Layout Stability

Always render an empty placeholder div (provides stable section height). Overlay the canvas-frame absolutely on top with a fade transition:

```svelte
{:else if section.type === 'canvas'}
  <div class="canvas-placeholder"></div>
  {#if isCanvasActive}
    <div class="canvas-frame" transition:fade={{ duration: 300 }}>
      <Canvas readOnly captureWheel={false} />
    </div>
  {/if}
```

```css
.canvas-frame {
  position: absolute;
  inset: 64px;
  top: 112px; /* 64px margin + 48px nav */
}
```

### 5. Generation Counters for Async Safety

Two levels prevent stale async work:

- **`canvasStore.initGeneration`**: Incremented on `initialize()`, `teardown()`, `suspend()`, `resume()`. Async init checks generation before committing state.
- **`activationGeneration`** in SiteSPA: Incremented on every activation/deactivation. Prevents stale `activateCanvas()` callbacks from completing after rapid scrolling.

## What Didn't Work

| Approach | Problem |
|----------|---------|
| Scroll-snap with click-to-activate | Bounce-back race when canvas section has `snap-align: none` |
| Transparent overlay for click detection | Svelte removes overlay from DOM before window click handler bubbles, causing `target.closest()` to return null |
| Boundary pass-through (3x wheel at edge) | Too complex alongside page scroll; user expectations unclear |
| `hover:opacity` hint text | Invisible to users, no clear affordance |
| `transition:fade` on if/else swap | Layout shifts because placeholder and canvas-frame have different sizes |

## Prevention

- **Don't mix scroll-snap with interactive embedded content**. Scroll-snap assumes control of scroll position, which conflicts with any component that also captures wheel/touch events.
- **Singleton stores need suspend/resume when content switches**. `teardown()` + `initialize()` is too expensive for frequent switches.
- **Beware DOM detachment in Svelte event handlers**. When a reactive update removes an element, event bubbling continues with a detached target — `target.closest()` returns null because the element has no parent. Use `target.isConnected` to detect this, or avoid patterns where click handlers remove their own DOM element.
- **Use absolute positioning for overlay transitions**. Never swap between sibling elements with different dimensions — overlay the dynamic content on a stable layout element.

## Related

- [Svelte 5 + TipTap Reactive Loop](./svelte5-tiptap-reactive-loop.md) — another integration issue with the canvas system
- [SVG Hop-Over Arcs Not Rendering](../ui-bugs/svg-hop-over-arcs-not-rendering.md) — canvas rendering issue
- `plans/feat-paginated-spa-site-view.md` — original plan
- `plans/feat-auto-interactive-canvas-sections.md` — evolution plan

## Key Files

- `src/lib/components/SiteSPA.svelte` — scroll container, canvas lifecycle
- `src/lib/components/Canvas.svelte` — d3-zoom, wheel handling, `interactive`/`captureWheel` props
- `src/lib/stores/canvas.svelte.ts` — singleton store, `suspend()`/`resume()`/`teardown()`
- `src/lib/utils/tiptap-html.ts` — server-side TipTap renderer for static previews
