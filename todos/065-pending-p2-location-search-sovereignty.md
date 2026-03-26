---
status: pending
priority: p2
issue_id: "065"
tags: [code-review, frontend-plan, sovereignty, simplification, phase-2]
dependencies: []
---

# Location Search: Server Proxy + Adapt PlaceSearch (Don't Create New)

## Problem Statement

Two issues with the location search approach in the plan:

1. **Sovereignty:** `PlaceSearch.svelte` calls the Photon API directly from the browser, leaking user IP addresses to an external service. Per the sovereignty lessons (`docs/solutions/architecture/sovereignty-lessons-learned.md` #1), runtime requests should not leak to third-party services.

2. **Simplification:** The plan hedges between "adapt PlaceSearch" and "create a new component." The answer is clear — adapting PlaceSearch is a 15-line refactor of `buildResult()` to return `LocationRef` instead of `{ exactLocation, postcode }`.

## Findings

**Architecture review:** The server-side `searchLocations` function in `location.ts` already exists with the correct return type and rate limiting. Route location searches through a server-side API endpoint.

**Simplicity review:** PlaceSearch.svelte's `buildResult` function (lines 109-126) already has geometry coordinates and properties from the Photon response. Just return the full `LocationRef` shape instead of flattening to two strings.

**Agent-native review:** An agent cannot search for locations — adding `GET /api/locations/search` provides both sovereignty compliance and API parity.

## Proposed Solutions

### Add server-side location search API + adapt PlaceSearch to call it
1. Add `GET /api/locations/search?q=...&region=berlin` wrapping `searchLocations` from `location.ts`
2. Update `PlaceSearch.svelte` to call the API endpoint instead of Photon directly
3. Update `PlaceResult` interface to match `LocationRef`
4. Update `buildResult()` to populate all `LocationRef` fields

- **Effort:** Small-Medium (2 hours)
- **Risk:** Low

## Acceptance Criteria

- [ ] No client-side requests to Photon/Nominatim — all geocoding goes through the app server
- [ ] PlaceSearch returns `LocationRef { place_id, name, address, lat, lng }`
- [ ] `GET /api/locations/search` endpoint exists for agent parity
- [ ] Rate limiting preserved server-side (1 req/sec per sovereignty doc)
- [ ] No new `LocationSearch.svelte` component created

## Resources

- Sovereignty lessons: `docs/solutions/architecture/sovereignty-lessons-learned.md` #1
- Existing search: `src/lib/services/location.ts`
- Existing component: `src/lib/components/PlaceSearch.svelte`
