---
status: pending
priority: p2
issue_id: "105"
tags: [code-review, compliance, map]
---

# OSM attribution removed — license violation

## Problem Statement

`MapView.svelte` sets `attributionControl: false` which hides the OSM attribution. The tile URL still points to `tile.openstreetmap.org`. The OpenStreetMap Tile Usage Policy and ODbL license require visible attribution.

## Proposed Solution

Re-enable with compact styling:
```javascript
attributionControl: true
```
Then style `.leaflet-control-attribution` smaller/more subtle via CSS.

## Acceptance Criteria

- [ ] OSM attribution visible on map
- [ ] Styled to not overlap feedback button or interfere with UX
