---
title: "feat: Map preview interaction — tap pin → preview card → detail"
type: feat
status: active
date: 2026-03-27
---

# Map Preview Interaction — Tap Pin → Preview Card → Detail

Replace direct navigation on pin tap with a two-step flow: tap a pin → see a preview card on the map → click through to the full conversation. Map fills the page. State persists on navigation.

## Current Behaviour

- Tap a pin with one conversation → navigates directly to `/prompts/[id]` (leaves the map)
- Tap a pin with multiple conversations in same area → BottomSheet shows list
- Map doesn't fill desktop
- Map state (zoom/position) resets on every visit
- No preview step — you lose the map context immediately

## New Behaviour

### Single pin tap
1. Map flies to centre on the pin (zoom in to at least 14 if lower)
2. Pin gets a "selected" visual state (subtle scale-up or ring)
3. A **Leaflet popup** appears above the pin styled as a preview card: cover image, title, snippet, time slot, area
4. Tapping the preview card navigates to the conversation detail
5. Tapping elsewhere on the map dismisses the popup (native Leaflet behaviour)

### Multi-pin area tap
1. Map pans to centre the area
2. BottomSheet slides up with the list of conversations (existing behaviour, already works)
3. Each card navigates to the conversation detail

### Map fills the page
- Desktop: map pane fills the full content area (no max-width constraint)
- Mobile: already full-width, verify edge-to-edge

### State persistence
- Use **SvelteKit snapshots** (built-in, uses sessionStorage under the hood)
- Capture before navigation: `{ center, zoom, viewMode }`
- Restore on back-navigation: map initialises with saved position
- View mode (list/map) also persists

## Technical Approach

### Preview card via Leaflet Popup (not a Svelte component)

The preview card is an `L.popup` with custom `className` that strips the default Leaflet speech-bubble styling. This is the recommended approach because:
- Leaflet handles positioning during pan/zoom automatically
- `autoPan` ensures the popup is visible
- `closeOnClick` handles dismiss-on-background natively
- No manual position tracking needed

The popup content is an `<a>` tag linking to the conversation, built from the `PromptSummary` data already available on each pin.

```typescript
marker.bindPopup(previewHtml, {
  className: 'preview-popup',
  closeButton: false,
  maxWidth: 320,
  minWidth: 280,
  offset: [0, -28],
  autoPan: true,
}).openPopup();
```

### State persistence via SvelteKit Snapshots

```typescript
export const snapshot: Snapshot = {
  capture: () => ({
    center: [map.getCenter().lat, map.getCenter().lng],
    zoom: map.getZoom(),
    viewMode
  }),
  restore: (value) => {
    mapCenter = value.center;
    mapZoom = value.zoom;
    viewMode = value.viewMode;
  }
};
```

### Map fills desktop

Remove max-width constraint on the map pane. The map already renders in its own `.map-pane` div outside the padded `.content` div.

## Changes

### MapView.svelte

- [ ] Single pin click: `flyTo` + `bindPopup` with styled preview card (instead of `onNavigate`)
- [ ] Preview card HTML: cover image (48x48 rounded), title, snippet (1-line), time+area (monospace)
- [ ] Selected pin visual state: CSS class on the marker `divIcon`
- [ ] Props: add `initialCenter`, `initialZoom` for state restoration (may already exist from PR #51 work)
- [ ] CSS: strip Leaflet popup default styling via `:global(.preview-popup)` rules
- [ ] Remove translucent `L.circle` fuzz overlays (design reference doesn't show them, privacy handled by fuzzCentroid offset)

### Discover page

- [ ] Add SvelteKit `snapshot` export for map state + view mode persistence
- [ ] Pass `initialCenter` / `initialZoom` to MapView from snapshot
- [ ] Map pane: ensure full width on desktop (no max-width constraint)
- [ ] Remove `onNavigate` prop — pin clicks now show popup, not navigate
- [ ] Keep `onSelectPin` for multi-pin areas (BottomSheet)

### CSS

- [ ] `:global(.preview-popup .leaflet-popup-content-wrapper)` — card styling (bg-canvas, radius-card, shadow, no padding)
- [ ] `:global(.preview-popup .leaflet-popup-tip)` — hide the speech bubble triangle
- [ ] Preview card layout: horizontal (image left, text right) or vertical (image top, text below)
- [ ] Selected marker state: `:global(.marker-pin.selected)` with transform scale or ring

## What NOT to do

- No marker clustering library — manual `general_area` grouping is correct for our scale (tens, not thousands)
- No custom DOM overlay — Leaflet popup handles positioning natively
- No URL params for map state — SvelteKit snapshots are cleaner
- No Canvas renderer — `divIcon` requires DOM, and 50-100 markers is fine

## Files Changed

| File | Change |
|------|--------|
| `src/lib/components/MapView.svelte` | Preview popup, flyTo, selected state, remove fuzz circles |
| `src/routes/(app)/discover/+page.svelte` | SvelteKit snapshot, map pane sizing, remove onNavigate |
| `src/lib/styles/shared.css` or MapView CSS | Preview popup styling |

## Acceptance Criteria

- [ ] Tapping a single pin flies to it and shows preview card
- [ ] Preview card shows cover image, title, snippet, time, area
- [ ] Tapping the preview card navigates to conversation detail
- [ ] Tapping map background dismisses preview
- [ ] Multi-pin area still opens BottomSheet list
- [ ] Map fills desktop viewport
- [ ] Map state (center, zoom, view mode) persists on back-navigation
- [ ] No fuzz circles (removed)
- [ ] Build passes, tests pass

## Sources

- UX research: Google Maps bottom sheet, Airbnb floating card, NN/g bottom sheet guidelines
- Leaflet: popup with custom className, flyTo with padding
- SvelteKit: snapshot API for state persistence
- Existing: `MapView.svelte`, `BottomSheet.svelte`, `discover/+page.svelte`
- Design reference: `docs/design/ref-map-mobile.jpg`
