---
status: complete
priority: p2
issue_id: "078"
tags: [code-review, css, cleanup]
dependencies: []
---

# ~200 Lines of Dead Code in Discover Page (CSS + JS)

## Problem Statement

The old inline filter bar was replaced by FloatingNav (PR #46), but both the CSS (~170 lines) and the JS (~65 lines) for the old filter bar were never removed from `src/routes/(app)/discover/+page.svelte`. This produces 35 unused CSS warnings in `svelte-check`.

## Findings

**Source:** svelte-check output, code-simplicity-reviewer

### Dead CSS (~170 lines)
`.filter-bar`, `.filter-group`, `.filter-label`, `.week-calendar`, `.day-cell`, `.day-cell:hover`, `.day-cell.selected`, `.day-name`, `.day-num`, `.location-filter`, `.location-chip`, `.chip-remove`, `.location-search`, `.location-input`, `.location-dropdown`, `.location-option`, `.clear-filters` (not `-link`), `.view-toggle`, `.toggle-btn`, `.where-group`, `.prompt-actions`.

Also dead: `.slots-section` and `.publish-btn` CSS in `prompts/[id]/+page.svelte` (no matching HTML).

### Dead JS (~65 lines)
- `formatSlotTime()` function (lines 157-162) — never called
- `availableAreas` derived (lines 70-78) — only consumed by dead `areaSuggestions`
- `areaQuery`, `areaDropdownOpen`, `areaSuggestions` state/derived (lines 83-90)
- `toggleArea()`, `removeArea()` functions (lines 123-135)
- `areaQuery = ''` line inside `clearFilters` (line 141) — no-op after cleanup

## Proposed Solutions

### Solution A: Delete all dead CSS and JS
Remove all unused CSS selectors and JS functions/variables.
- **Effort:** Small (15 min)
- **Risk:** None — all code is unreachable

## Acceptance Criteria

- [ ] `svelte-check` reports 0 unused CSS selectors in discover page
- [ ] No dead JS functions/variables remain
- [ ] No visual regressions

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-26 | Created from PR #51 review | Remove dead CSS when removing HTML |
