---
status: pending
priority: p2
issue_id: "086"
tags: [ux, map, interaction]
dependencies: []
---

# Map BottomSheet blocks map interaction

## Problem Statement

The BottomSheet preview on the map uses a full-screen backdrop that prevents clicking the map while the sheet is open. Users can't pan, zoom, or click other pins without first dismissing the sheet.

## Proposed Solutions

### A. Non-modal overlay with map click callback
Remove the blocking backdrop. Add `onMapClick` callback to MapView that fires when clicking the map background (not a pin). Discover page uses this to close the sheet.

### B. Pointer-events passthrough on backdrop
Set `pointer-events: none` on backdrop, `pointer-events: auto` on sheet. Map remains interactive. Sheet dismisses via close button only.

### C. Replace BottomSheet with a sidebar panel on desktop
Desktop: sidebar panel alongside map. Mobile: non-modal bottom card. Different components for different form factors.
