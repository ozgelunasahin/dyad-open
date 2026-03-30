---
status: pending
priority: p2
issue_id: "092"
tags: [code-review, cleanup, quality]
dependencies: []
---

# Hotfix iteration artifacts — dead code cleanup

## Problem Statement

Rapid hotfix iterations left dead code: unused imports, dead CSS, YAGNI props, redundant attributes.

## Items

- [ ] Remove unused `formatHybridDate, formatSlotTime, formatSlotDetails` import from `conversations/[id]/+page.svelte:6`
- [ ] Remove dead `.invite-section` CSS rule from `conversations/[id]/+page.svelte:279`
- [ ] Remove `past` prop, `class:past`, and `.slot-card.past` CSS from `SlotCard.svelte` (no caller uses it)
- [ ] Remove redundant `role="button"` from `<button>` in `SlotCard.svelte:26`
- [ ] Remove unreachable `{#if invited}` badge inside button branch of `SlotCard.svelte:30`
- [ ] Simplify `nearby.length > 0` guard to just `nearby` in `MapView.svelte:97`
- [ ] Remove redundant `aspect-ratio: 1` from `.marker-img` in `MapView.svelte` (width+height already fixed)
