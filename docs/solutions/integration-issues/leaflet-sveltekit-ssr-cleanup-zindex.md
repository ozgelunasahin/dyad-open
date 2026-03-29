---
topic: Leaflet in SvelteKit — SSR guard, reactive markers, cleanup, z-index collisions
date: 2026-03-27
prs: [43, 44, 46]
tags: [leaflet, sveltekit, ssr, map, cleanup, z-index, privacy, fuzz]
---

# Leaflet in SvelteKit: Four Non-Obvious Problems

## Context

PRs #43-46 added a map view to the discover page with Leaflet. The map shows conversation pins at fuzzed neighbourhood positions, supports reactive filtering, and coexists with a FloatingNav overlay and a mobile hamburger panel. Getting all of this to work together surfaced four distinct problems that are easy to hit in any SvelteKit + Leaflet integration.

## What We Learned

### 1. Dynamic import is mandatory, not optional

Leaflet accesses `window` and `document` at import time, not just at usage time. A bare `import L from 'leaflet'` at the top of a `.svelte` file causes SSR to crash. The fix is a dynamic import inside `onMount`:

```typescript
onMount(async () => {
  const L = await import('leaflet');
  // All Leaflet usage must be inside this callback
});
```

This is standard SvelteKit advice, but Leaflet is especially aggressive about accessing browser globals during module evaluation (not just during function calls). You cannot use a top-level `import` even if you gate all usage behind `if (browser)`.

### 2. Reactive marker rebuilds need a stored module reference

When `filteredPrompts` changes (user applies date/neighbourhood filter), the map markers must update. But `$effect` runs synchronously -- you cannot `await import('leaflet')` inside it. The solution: store the Leaflet module reference from `onMount` and use it in `$effect`:

```typescript
let leafletModule: typeof import('leaflet') | undefined;
let markerLayer: LayerGroup | undefined;

onMount(async () => {
  const L = await import('leaflet');
  leafletModule = L;
  markerLayer = L.layerGroup().addTo(map);
  rebuildMarkers(L);
});

$effect(() => {
  // This runs whenever `prompts` changes
  if (leafletModule && markerLayer) {
    rebuildMarkers(leafletModule);
  }
});
```

The `rebuildMarkers` function calls `markerLayer.clearLayers()` then re-adds all markers. This is the `LayerGroup.clearLayers()` pattern -- simpler and less error-prone than trying to diff individual markers.

### 3. z-index collisions with mobile overlays

Leaflet's tile pane defaults to `z-index: 200`, its controls to `z-index: 800-1000`. The mobile hamburger panel from the `(app)` layout was initially at `z-index: 200-300`. Result: the map rendered on top of the mobile navigation panel.

PR #44 fixed this by bumping the mobile overlay to `z-index: 1000` and the panel to `z-index: 1001`. The FloatingNav (PR #46) used `z-index: 800`, deliberately sitting above map controls but below the mobile panel.

The lesson: when adding a map library, audit all `z-index` values across your layout. Leaflet silently occupies a wide range of z-indices. Document your z-index tiers:

| Range | Usage |
|-------|-------|
| 1-199 | Page content |
| 200-599 | Leaflet tile panes |
| 600 | BottomSheet backdrop |
| 800 | FloatingNav, Leaflet controls |
| 1000-1001 | Mobile overlay + panel |

### 4. Cleanup: `map.remove()` in `onDestroy`

Leaflet allocates event listeners on `window` (for resize) and creates DOM nodes outside Svelte's control. Without cleanup, switching from map view to list view leaks event handlers and DOM nodes:

```typescript
onDestroy(() => {
  map?.remove();  // Removes all event listeners AND DOM nodes
  map = undefined;
  markerLayer = undefined;
});
```

`map.remove()` is Leaflet's comprehensive cleanup -- it handles everything. Do NOT try to manually remove layers or event listeners before calling it. Setting references to `undefined` afterward prevents stale access from any pending `$effect` runs.

## The Fix / Pattern

A complete MapView component lifecycle:

1. `onMount`: dynamic import, create map, create LayerGroup, initial marker build
2. `$effect`: rebuild markers when reactive props change (using stored module ref)
3. `onDestroy`: `map.remove()`, null out references
4. `<svelte:head>`: load self-hosted Leaflet CSS (not from CDN)
5. Icon path override: `(L.Icon.Default as any).prototype.options.imagePath = '/leaflet/'`

## Why This Matters

Leaflet is one of the most popular mapping libraries, but it predates modern framework conventions. It manages its own DOM, its own event system, and its own CSS z-index hierarchy. Every integration with a reactive framework (Svelte, React, Vue) must handle the same four problems: SSR safety, reactive updates without re-importing, z-index coordination, and lifecycle cleanup. Getting any one wrong produces subtle bugs (SSR crash, stale markers, overlapping UI, memory leaks) that only appear in specific interaction sequences.
