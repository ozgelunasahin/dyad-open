---
title: "feat: Map view on discover page"
type: feat
status: active
date: 2026-03-26
origin: docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md
---

# Map View on Discover Page

Add a map/list toggle to the discover page. Users can switch between the current list view and a map showing conversation pins by neighbourhood. Tapping a pin shows a bottom sheet with the conversation details.

## Overview

The discover page already has all the data needed — `PromptSummary.available_slots` carries `general_area_lat`/`general_area_lng` for each slot. Leaflet is installed and assets are self-hosted in `static/leaflet/`. This PR adds a new `MapView.svelte` component and a view-mode toggle on the discover page.

## Technical Decisions

### Tile provider: OpenFreeMap (EU sovereignty)

Default OpenStreetMap tiles (`tile.openstreetmap.org`) are served from a global CDN and leak user IPs. Ozge's original MapView used unpkg for CSS/icons — a sovereignty violation.

**OpenFreeMap** is the recommended tile provider:
- EU-hosted on Hetzner
- Free, no API key required
- Raster tile URL: `https://tile.openfreemap.org/{z}/{x}/{y}.png` (verify at implementation time — their primary offering is vector tiles for MapLibre GL JS, not Leaflet raster tiles)
- If raster tiles are not available, fall back to standard OSM tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) which are acceptable for MVP (OSMF is EU-based, tiles served from EU edge nodes)

**Fallback path**: If we need full sovereignty, self-host PMTiles on Cloudflare R2. Heavier setup, defer unless needed.

**Leaflet CSS and icons**: Already self-hosted in `static/leaflet/` from the sovereignty fix (commit `36a8429`). No CDN requests.

### SSR handling

Leaflet requires `window` and `document`. Use dynamic `import('leaflet')` inside `onMount` — standard SvelteKit pattern. The map component renders nothing during SSR.

### Pin placement

Each `PromptSummary` has `available_slots` with `general_area_lat`/`general_area_lng`. For map pins:
- Group by `general_area` string (not by floating point comparison)
- One pin per unique neighbourhood — aggregate all prompts with slots in that neighbourhood
- Skip slots where lat/lng is null
- Pin colour: dark (`#1a1a1a`) with cream border — matches Ozge's design
- Use `L.circleMarker` (radius 9) — simple, no icon images needed
- Pins must update reactively when `filteredPrompts` changes (use `$effect` + `LayerGroup.clearLayers()`, not just `onMount`)

### Bottom sheet on pin click

Adapted from Ozge's MapView design:
- Svelte `fly` transition from bottom
- A pin may represent multiple conversations (same neighbourhood) — bottom sheet shows a list if >1, or a single card if 1
- Shows per card: cover image, title, snippet, neighbourhood, soonest date
- Click navigates to `/prompts/[id]`
- Backdrop click closes

## Implementation Steps

### Step 1: Create MapView component

`src/lib/components/MapView.svelte`:
- [ ] Dynamic `import('leaflet')` in `onMount`
- [ ] Load self-hosted CSS from `/leaflet/leaflet.css` via `<link>` in `<svelte:head>`
- [ ] Configure Leaflet icon paths to `/leaflet/` (override default CDN paths)
- [ ] Tile layer: OpenFreeMap raster tiles (`tiles.openfreemap.org`)
- [ ] Props: `prompts: PromptSummary[]`, `onSelectPrompt: (prompt) => void`
- [ ] Build pin data: deduplicate by neighbourhood, aggregate prompts per location
- [ ] `L.circleMarker` for each pin (radius 9, dark fill, cream border)
- [ ] Pin click → call `onSelectPrompt`
- [ ] Default view: centered on Berlin (52.52, 13.405), zoom 12
- [ ] Cleanup: destroy map instance on component unmount

### Step 2: Create BottomSheet component

`src/lib/components/BottomSheet.svelte`:
- [ ] Props: `prompt: PromptSummary | null`, `onClose: () => void`
- [ ] Svelte `fly` transition (y: 120, duration 240ms)
- [ ] Show: cover image, title, snippet, neighbourhood, date
- [ ] Click body → navigate to `/prompts/[id]`
- [ ] Backdrop click or swipe down → close
- [ ] Mobile: full width, max-height 40vh. Desktop: 400px wide, positioned bottom-right.

### Step 3: Add view toggle to discover page

`src/routes/(app)/discover/+page.svelte`:
- [ ] Add `viewMode` state: `'list' | 'map'`
- [ ] Toggle button group in the filter bar area (list icon / map icon)
- [ ] Conditionally render prompt list (existing) or MapView
- [ ] Both views use the same `filteredPrompts` — filters apply to both
- [ ] `selectedPrompt` state for the bottom sheet
- [ ] "Start a conversation" button visible in both views

### Step 4: Verify

- [ ] Build passes
- [ ] Tests pass
- [ ] Map shows pins at correct Berlin neighbourhood locations
- [ ] Clicking a pin opens bottom sheet with conversation details
- [ ] Bottom sheet click navigates to conversation detail page
- [ ] Filters (When/Where) apply to both list and map views
- [ ] No external CDN requests (check browser network tab)
- [ ] Map works on mobile (touch zoom, responsive bottom sheet)

## Acceptance Criteria

- [ ] Build passes, tests pass
- [ ] Map view toggle on discover page
- [ ] Pins placed at neighbourhood centroids (not exact locations)
- [ ] Bottom sheet shows conversation summary on pin click
- [ ] Zero external CDN/API requests from the client (sovereignty)
- [ ] Self-hosted Leaflet CSS and icons (already in `static/leaflet/`)
- [ ] EU-hosted tile provider (OpenFreeMap on Hetzner)
- [ ] Mobile responsive (touch zoom, full-width bottom sheet)
- [ ] Map cleanup on component unmount (no memory leaks)

## Sources

- **Ozge's MapView (deleted):** `git show origin/feat/v0.1-design-work:src/lib/components/MapView.svelte` — bottom sheet pattern, circle markers, pin styling
- **Sovereignty lessons:** `docs/solutions/architecture/sovereignty-lessons-learned.md` — self-host runtime assets
- **Self-hosted Leaflet assets:** `static/leaflet/`
- **Slot lat/lng:** `src/lib/domain/types.ts` lines 37-38 (general_area_lat/lng)
- **Discover page:** `src/routes/(app)/discover/+page.svelte` — filter bar integration point
- **OpenFreeMap:** EU-hosted, free, no API key — `tiles.openfreemap.org`
