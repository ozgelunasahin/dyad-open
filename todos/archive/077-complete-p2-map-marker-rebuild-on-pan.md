---
status: complete
priority: p2
issue_id: "077"
tags: [code-review, performance, svelte, leaflet, reactivity]
dependencies: []
---

# Map Markers Rebuild on Every Pan/Zoom Gesture

## Problem Statement

The `$effect` in `MapView.svelte:149-153` rebuilds all markers whenever the component re-renders. Because `onMoveEnd` updates `$state` in the parent, every pan/zoom gesture triggers: moveend → state update → parent re-render → MapView receives new props → `$effect` fires → `rebuildMarkers()` destroys and recreates all marker DOM elements.

## Findings

**Source:** performance-oracle, learnings-researcher

The `$effect` auto-tracks `prompts` (via `buildPins(prompts)` inside `rebuildMarkers`). But because the parent passes new prop values for `initialCenter`/`initialZoom` on every move, Svelte 5 marks the component dirty and re-runs the effect even though `prompts` hasn't changed.

From `docs/solutions/integration-issues/svelte5-tiptap-reactive-loop.md`: store updates triggered from component callbacks can create infinite reactive loops when components re-render and trigger the callback again.

**Current impact:** Barely noticeable with 2-5 pins. At 50-100 pins, every gesture frame would destroy and recreate all marker DOM elements.

## Proposed Solutions

### Solution A: Track only `prompts` in the effect (Recommended)
Use an explicit dependency or compare the prompts reference:
```ts
let prevPrompts: PromptSummary[] | undefined;
$effect(() => {
    // Only rebuild when prompts actually changes
    if (leafletModule && markerLayer && prompts !== prevPrompts) {
        prevPrompts = prompts;
        rebuildMarkers(leafletModule);
    }
});
```
- **Pros:** Simple, targeted fix
- **Cons:** Manual tracking
- **Effort:** Small
- **Risk:** Low

### Solution B: Don't pass mapCenter/mapZoom back as props
The parent saves state to sessionStorage but doesn't need to pass it back into MapView as new props each time. Only pass initialCenter/initialZoom once on mount, not reactively.
- **Pros:** Eliminates the re-render entirely
- **Cons:** Need to restructure state flow slightly
- **Effort:** Small
- **Risk:** Low

## Technical Details

- **Affected files:** `src/lib/components/MapView.svelte`, `src/routes/(app)/discover/+page.svelte`

### Solution C: Debounce `onMoveEnd` at 300ms
Leaflet's `moveend` fires 5-15 times during a single inertial swipe. Debouncing prevents rapid-fire state updates:
```ts
let moveEndTimer: ReturnType<typeof setTimeout>;
map.on('moveend', () => {
    clearTimeout(moveEndTimer);
    moveEndTimer = setTimeout(() => {
        if (!map) return;
        const c = map.getCenter();
        onMoveEnd?.([c.lat, c.lng], map.getZoom());
    }, 300);
});
```
- **Pros:** Reduces state updates from 5-15 per gesture to 1
- **Cons:** 300ms delay before sessionStorage save
- **Effort:** Small
- **Risk:** None

**Recommended:** Combine Solution A + C for both fixes.

## Acceptance Criteria

- [ ] Panning/zooming the map does NOT rebuild markers
- [ ] Changing the `prompts` data DOES rebuild markers
- [ ] Map state is still saved to sessionStorage
- [ ] `onMoveEnd` is debounced

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-26 | Created from PR #51 review | Svelte 5 $effect auto-tracks all accessed reactive state |
