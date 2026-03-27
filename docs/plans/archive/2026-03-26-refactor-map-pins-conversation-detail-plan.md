---
title: "refactor: Circular map pins + conversation detail layout"
type: refactor
status: active
date: 2026-03-26
---

# Circular Map Pins + Conversation Detail Layout

Two small visual changes in one PR, both matching the design reference screenshots.

## Map pins: square → circular

**Current:** Square thumbnails with `border-radius: 8px` (`MapView.svelte` lines 189, 198)
**Design ref (`ref-map-mobile.jpg`):** Dark circular pins
**User request:** Circular cropped cover images as small round buttons

Changes (2 CSS lines + 6 lines deleted):
- [ ] `.marker-img`: change `border-radius: 8px` → `border-radius: 50%`
- [ ] `.marker-placeholder`: change `border-radius: 8px` → `border-radius: 50%`
- [ ] Remove fuzzy translucent circles (lines 74-79 of `MapView.svelte`) — design reference doesn't show them, and the fuzzCentroid offset already provides privacy

## Conversation detail: full-width cover + cleaner layout

**Current:** Cover image inside content column, title, author, body, slots, response form
**Design ref (`ref-conversation-detail-mobile.jpg`):** Full-width cover image edge-to-edge, @author + date, title, body, bottom action bar

Changes to `src/routes/(app)/prompts/[id]/+page.svelte`:
- [ ] Cover image: full-width (break out of content column), edge-to-edge on mobile
- [ ] Below cover: @author in monospace + date in serif
- [ ] Title in larger serif
- [ ] Body text
- [ ] Fallback for missing cover: show nothing (not a broken layout) — cover images will become mandatory later

## Files changed

- `src/lib/components/MapView.svelte` — circular pins, remove fuzzy circles
- `src/routes/(app)/prompts/[id]/+page.svelte` — conversation detail layout

## Acceptance Criteria

- [ ] Map pins are circular (50% border-radius)
- [ ] No fuzzy translucent circles on map
- [ ] Conversation detail has full-width cover image
- [ ] Build passes, tests pass
- [ ] Verified with agent-browser screenshot
