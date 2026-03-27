---
topic: Preserving map position across navigation using SvelteKit snapshots
date: 2026-03-27
prs: [58]
tags: [sveltekit, leaflet, map, snapshots, navigation]
---

# Map State Preservation with SvelteKit Snapshots

## Context

PR #58 reworked the discover page's map view. The original implementation reset the map to Berlin's center coordinates every time the user navigated to a conversation detail page and then pressed back. Users would zoom into Kreuzberg, tap a pin, read the conversation, press back, and find themselves looking at all of Berlin again. This made the map unusable for browsing multiple nearby conversations.

## What We Learned

1. **SvelteKit's snapshot API is purpose-built for this.** The `export const snapshot` object on a page component captures and restores ephemeral UI state across client-side navigations. It hooks into the browser's history state, so back/forward navigation restores the snapshot automatically.

   ```typescript
   export const snapshot: Snapshot<{
       center: [number, number] | null;
       zoom: number | null;
       viewMode: 'list' | 'map';
   }> = {
       capture: () => ({ center: mapCenter, zoom: mapZoom, viewMode }),
       restore: (value) => {
           mapCenter = value.center;
           mapZoom = value.zoom;
           viewMode = value.viewMode;
       }
   };
   ```

   This also preserves the list/map toggle state -- if you were in map view, you return to map view.

2. **The map component needs `initialCenter` and `initialZoom` props.** The snapshot stores the coordinates, but the `MapView` component must accept them as initial values rather than always defaulting to `BERLIN_CENTER`. The component only uses geolocation fallback when no initial position is provided:

   ```typescript
   // Only geolocate if no saved position
   if (!initialCenter && 'geolocation' in navigator) { ... }
   ```

3. **Debounce `moveend` events.** Leaflet fires `moveend` on every pan and zoom gesture. Without debouncing, the snapshot captures intermediate positions during animated zooms. A 300ms debounce on the `moveend` handler ensures only the final position is reported:

   ```typescript
   let moveEndTimer: ReturnType<typeof setTimeout>;
   map.on('moveend', () => {
       clearTimeout(moveEndTimer);
       moveEndTimer = setTimeout(() => {
           const c = map.getCenter();
           onMoveEnd?.([c.lat, c.lng], map.getZoom());
       }, 300);
   });
   ```

4. **BottomSheet replaces direct navigation for pin clicks.** The original MapView navigated directly to the conversation detail when a single pin was clicked (`onNavigate(promptId)`). PR #58 changed this to always show a BottomSheet preview, regardless of whether one or multiple conversations are at that location. This is better because: (a) the user keeps their map context, (b) they can dismiss the sheet and keep browsing, and (c) the interaction is consistent -- tap always shows preview, never surprise-navigates.

5. **Map should be a sibling of content, not nested inside it.** The map pane was moved outside the `.content` wrapper so it can fill the viewport edge-to-edge. The list view stays inside `.content` with `max-width: 800px`. This required restructuring the Svelte template from nested `{#if}` blocks to sibling top-level blocks:

   ```svelte
   {#if viewMode === 'map'}
       <div class="map-pane">...</div>
   {:else}
       <div class="content">...</div>
   {/if}
   ```

## The Fix / Pattern

For any page with interactive state that should survive navigation:

1. Identify the ephemeral state (scroll position, zoom level, toggle state, selected filters)
2. Add `export const snapshot` with `capture` and `restore` functions
3. Pass restored values as initial props to child components
4. Ensure child components accept and use initial values instead of hardcoding defaults
5. Debounce position/state callbacks to avoid capturing intermediate states

SvelteKit snapshots are stored in `history.state` and do not survive page reloads. For state that should persist across sessions, use `localStorage` or URL search params instead.

## Why This Matters

Map-based interfaces live or die on state preservation. Users build a mental model of where they are on the map, and losing that context on every navigation makes the map feel broken rather than useful. The SvelteKit snapshot API makes this nearly free to implement -- the hard part is knowing it exists and structuring components to accept initial state.
