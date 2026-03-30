---
title: "fix: Update E2E tests for landing page and profile UI redesign"
type: fix
status: active
date: 2026-03-30
---

# Update E2E Tests After UI Redesign

PR #81 redesigned the landing page (map-first, new tagline, no FloatingNav) and profile page (tab-based layout). 5 of 26 E2E tests now fail because they assert against the old UI structure.

## Failing tests

### 1. `smoke.responsive.test.ts:5` — "landing page loads for anonymous users"
**Problem:** Asserts `getByText('cultivating a culture')` — the tagline changed to "A place on the web to find people to talk to, face to face."
**Fix:** Update to match the new tagline, or use a more stable selector (e.g. `.tagline`).

### 2. `smoke.responsive.test.ts:41` — "Map view toggles"
**Problem:** Clicks `getByRole('button', { name: 'Map view' })` then asserts `.map-container` visible. The discover page now shows map by default, so the toggle button says "List view" not "Map view". And the map container class may have changed.
**Fix:** Update to click "List view" then "Map view" (toggle back), or assert map is visible on load then toggle to list.

### 3. `core-flow.test.ts:5` — "Full flow: respond → invite → accept"
**Problem:** At the Sophie-accepts step (line 64), it asserts `getByText('@tom wants to meet')` on the profile page. The page snapshot shows this text IS present, so this may be a timing issue with the new tab-based profile layout, or the attention section renders differently with the new "home" view.
**Fix:** Add `{ timeout: 10000 }` or navigate to the correct view (`/profile?view=home` or just `/profile`). Check if the home view shows attention cards.

## Acceptance Criteria

- [ ] All 26 Playwright tests pass on the `ozge/final-edit-private-beta` branch
- [ ] Landing page smoke test uses stable selectors (not copy strings that change with wording)
- [ ] Map toggle test handles the new map-default discover layout
- [ ] Core flow test works with the new tab-based profile
- [ ] No test uses hardcoded copy strings — use CSS class selectors or `data-testid` where needed

## Convention: stable test selectors

From the vague-slots solution doc (`docs/solutions/ux-patterns/vague-slots-progressive-disclosure-before-response.md`):
> E2E selectors should use stable structural selectors (CSS classes, roles, data attributes), not copy strings that change with wording decisions.

Where possible, prefer:
- `.class-name` selectors (stable across copy changes)
- `getByRole` with aria labels (stable)
- `data-testid` attributes (most stable but requires template changes)

Over:
- `getByText('exact copy')` (breaks on any wording change)
- `getByPlaceholder('exact placeholder')` (same problem)

## Files

- `tests/e2e/smoke.responsive.test.ts` — landing page + map toggle tests
- `tests/e2e/core-flow.test.ts` — profile assertion after accepting invitation

## Sources

- PR #81: `ozge/final-edit-private-beta`
- Selector convention: `docs/solutions/ux-patterns/vague-slots-progressive-disclosure-before-response.md`
- Test error contexts: `test-results/e2e-smoke.responsive-*/error-context.md`
