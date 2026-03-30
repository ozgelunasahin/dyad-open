---
topic: FloatingNav per-page variant pattern — each page owns its nav, not the layout
date: 2026-03-30
prs: [79]
tags: [architecture, navigation, svelte, layout, floatingnav, variants]
---

# FloatingNav Per-Page Variant Pattern

## Context

PR #79 added a `profile` variant to `FloatingNav`, bringing the total to three: `discover`, `default`, and `profile`. Each variant renders different buttons and behaviours. The pattern of per-page rendering (not layout-based) was already established but this PR tested it at scale — three distinct variants with different prop signatures.

## What We Learned

### Why per-page, not per-layout

The obvious approach is to render `FloatingNav` in `(app)/+layout.svelte` and pass variant-specific props down. This doesn't work because:

1. **Different prop signatures**: `discover` needs `onMapClick`, `weekDates`, `selectedDays`. `profile` needs `onCalendarClick`, `calendarActive`. `default` needs `saveStatus`, `onPublish`. No single set of props covers all variants.
2. **State ownership**: Search state (`searchOpen`, `searchQuery`) and filter state (`meetingsOnly`) live in the page, not the layout. Lifting them to the layout creates coupling between layout and child pages.
3. **Layout renders for all children**: `(app)/+layout.svelte` renders for `/discover`, `/profile`, `/conversations/[id]`, `/meetings/[id]`, `/feedback/[id]`. A single FloatingNav instance would need to know which page it's on and render accordingly — inverting the dependency (layout knows about children).

See also: `docs/solutions/ux-patterns/sveltekit-route-groups-for-layout-isolation.md`

### The pattern

Each page renders its own `<FloatingNav variant="..." />` with page-specific props:

```svelte
<!-- discover/+page.svelte -->
<FloatingNav variant="discover" onMapClick={...} weekDates={...} onSearchClick={...} />

<!-- profile/+page.svelte -->
<FloatingNav variant="profile" attentionCount={data.attentionCount} onCalendarClick={...} />

<!-- conversations/[id]/+page.svelte -->
<FloatingNav variant="default" />
```

### Duplicate SVG icons are acceptable

The `profile` variant duplicates 4 SVG icons from the `discover` variant (search, calendar, plus, profile). Extracting them into shared components would add indirection for icons used in exactly two places. The duplication is ~20 lines of SVG each. If a fourth variant appears, extraction becomes worthwhile.

### `attentionCount` must be single-source

The profile page initially computed `attentionCount` both server-side (in the loader return) and client-side (as a `$derived` from the same arrays). This duplication would silently diverge when the formula changed. The fix: server computes it, client uses `data.attentionCount` directly.

More broadly, the layout-level `attentionCount` (from `load-layout-data.ts`) counts only invitations + feedback. The profile loader adds `cancelledNotifications`. This divergence is documented but not yet fixed — tracked for v0.2.

## The Fix / Pattern

1. Add new variant to the `variant` union type and the template's `{#if variant === '...'}` chain.
2. Add variant-specific props to the interface (e.g. `onCalendarClick`, `calendarActive`).
3. Render `<FloatingNav>` in the page component, passing page-owned state as callbacks.
4. Mark the current page's icon as `active-icon` + `aria-current="page"` in the variant block.

## Why This Matters

SvelteKit's route groups (`(app)`, `(editor)`, `(auth)`) already isolate layout concerns. Per-page FloatingNav extends this philosophy to navigation: each page knows what actions it offers, and the nav is just the affordance for those actions. This scales to N variants without the layout becoming a god component.
