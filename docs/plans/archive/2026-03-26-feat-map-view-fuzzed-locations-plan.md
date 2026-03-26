---
title: "feat: Map view with fuzzy circles and cover image markers"
type: feat
status: active
date: 2026-03-26
---

# Map View with Fuzzy Circles and Cover Image Markers

Amend PR #43. Rework MapView to show Airbnb-style fuzzy circles with cover image markers instead of plain dots at neighbourhood centroids.

## Approach: Client-Side Fuzz from Centroid

No migration or backend changes needed. The `general_area_lat`/`general_area_lng` centroids are already imprecise (neighbourhood-level from Nominatim reverse geocoding). We fuzz these further at render time using a deterministic hash of the slot ID to spread overlapping pins.

**Why not store fuzzed coordinates?** The centroid is already 200-800m from the actual venue. Adding a 200-400m client-side offset produces a point that's sufficiently imprecise for the map view. No exact_location data needs to be read or processed.

**Privacy guarantee:** The fuzzed point is derived entirely from public data (centroid + slot ID). No exact_location is involved at any level.

## Configuration

Constants at the top of MapView.svelte (configurable by editing):

```typescript
const FUZZ_MIN_METERS = 150;  // minimum offset from centroid
const FUZZ_MAX_METERS = 400;  // maximum offset from centroid
const CIRCLE_RADIUS_METERS = 300;  // translucent circle visual radius
```

## Implementation (MapView.svelte only)

- [ ] Add `fuzzCentroid(id: string, lat: number, lng: number)` — deterministic offset using a simple hash of the slot ID. Ring distribution (not square). Configurable min/max.
- [ ] Plot per-slot (not per-neighbourhood) at fuzzed centroid positions
- [ ] Draw `L.circle` (300m radius, translucent fill `rgba(26,26,26,0.08)`, no stroke) behind each marker
- [ ] Replace `L.circleMarker` with `L.divIcon` containing cover image thumbnail (48px rounded square) or a styled placeholder
- [ ] Pin click opens BottomSheet with the conversation details
- [ ] Reactive marker rebuilding via `$effect` + `LayerGroup.clearLayers()` when filteredPrompts changes
- [ ] Latitude correction on longitude offset (`/ cos(radians(lat))`)

## Acceptance Criteria

- [ ] Build passes, tests pass
- [ ] Map shows fuzzed positions (pins spread across neighbourhood, not all at centroid)
- [ ] Translucent circles communicate approximate area
- [ ] Cover images visible as map markers (placeholder for missing images)
- [ ] BottomSheet shows conversation details on marker click
- [ ] Fuzz parameters configurable as constants
- [ ] No backend changes, no migration
