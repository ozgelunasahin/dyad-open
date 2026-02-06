# feat: Paginated SPA Site View with Section Snap & Click-to-Explore

## Overview

Transform the published site view from a single merged SVG canvas into a **paginated single-page application** where each section occupies a full viewport, snaps into view on scroll, and supports "click to dive deeper" into interactive canvas mode.

**Goal:** Visitors can see all parts of what dyad.berlin does without clicking anything. Clicking is to go deeper.

## Problem Statement

Currently, the published site (`/sites/@username/slug`) renders ALL sections as one merged SVG canvas via `buildLandingCanvasData()` in `src/lib/server/load-site-sections.ts`. This means:

- Content is spatially scattered on an infinite canvas — visitors must scroll/pan to discover sections
- No clear "pages" or content hierarchy for first-time visitors
- No way to get a quick overview of all sections without navigating
- The sidebar nav works but requires intentional clicks to discover content

## Proposed Solution

```
┌─────────────────────────┐
│ ▸ Sticky Nav Bar        │  ← auto-hides on scroll down, shows on scroll up
├─────────────────────────┤
│                         │
│   Section 1 (Hero)      │  ← full viewport height, native HTML
│                         │
├─────────────────────────┤
│                         │
│   Section 2 (Canvas)    │  ← static HTML card preview + vignette overlay
│   "Explore →"           │
│                         │
├─────────────────────────┤
│                         │
│   Section 3 (Canvas)    │  ← another canvas section
│                         │
├─────────────────────────┤
│   Section 4 (Contact)   │  ← HTML form section
└─────────────────────────┘
```

**Click-to-explore** transitions a canvas section from "static preview" (plain HTML divs) to "interactive" (real `<Canvas>` with d3-zoom pan/zoom, wikilink navigation).

## Technical Approach

### Key Files

| File | Change |
|------|--------|
| `src/routes/sites/@[username]/[canvas]/+page.svelte` | Replace single `<Canvas>` with section-based scroll-snap layout |
| `src/routes/sites/@[username]/[canvas]/+page.server.ts` | Call `loadSiteSections()` directly, pass `SectionData[]` to page |
| `src/lib/server/load-site-sections.ts` | Narrow `HtmlSectionData.config` types; keep `buildLandingCanvasData()` as fallback |
| `src/lib/stores/canvas.svelte.ts` | Add generation token to `initialize()`, add `teardown()` method |
| `src/lib/components/Canvas.svelte` | Fix d3-zoom cleanup on unmount, cancel uncancelled timeouts |
| **New:** `src/lib/components/site/SiteNav.svelte` | Sticky auto-hiding top nav bar |
| **New:** `src/lib/utils/tiptap-html.ts` | Server-side TipTap JSON → sanitized HTML renderer |

### Data Flow

**Current:** `loadSiteSections()` → `buildLandingCanvasData()` merges all → one `<Canvas readOnly>`

**New:** `loadSiteSections()` → pass `SectionData[]` to page → each section renders independently

The existing `SectionData` discriminated union at `load-site-sections.ts:37` already works. The only type improvement needed: narrow `HtmlSectionData.config` from `Record<string, unknown>` to typed `HeroConfig` / `ContactConfig` interfaces. Do this when it causes a bug, not upfront.

### New Dependency: TipTap Server-Side HTML Rendering

Static canvas previews need note content rendered as HTML. **No server-side TipTap renderer currently exists in the codebase.** This is new work:

- Add `@tiptap/html` with `generateHTML()` and register matching extensions (wikilinks, etc.)
- **All output MUST be passed through `DOMPurify.sanitize()` before use in `{@html}` blocks** (the project already uses `isomorphic-dompurify`)
- Alternative for v1: render only card titles (plain strings from vault) — skip content rendering entirely. The previews are decorative behind a vignette overlay; titles may be sufficient.

### Implementation

**Single phase — static previews + click-to-explore together.** Shipping previews without interactive mode would be a regression from the current view.

#### Scroll-Snap Section Layout

- [ ] Update `+page.server.ts` to return `loadSiteSections()` result directly as `sections` prop
- [ ] Update `+page.svelte`: scroll-snap container with `{#each sections}` loop
- [ ] Create `SiteNav.svelte`: sticky top nav, auto-hides via IntersectionObserver sentinel
- [ ] Hero sections: native HTML, centered content
- [ ] Contact sections: native HTML form with rate limiting on submission
- [ ] Canvas sections: static positioned `<div>`s with card titles (+ optional rendered content), scaled with CSS `transform`, vignette overlay with "Explore →" CTA
- [ ] IntersectionObserver tracks active section → updates nav highlight
- [ ] Nav click → `scrollIntoView({ behavior: 'smooth' })`
- [ ] Preserve theme toggle from current layout

#### Click-to-Explore Interactive Mode

- [ ] Click canvas preview → destroy static preview, mount `<Canvas readOnly>` via `{#if}`
- [ ] `canvasStore.initialize()` with section's vault and positions
- [ ] Show "✕ Back to overview" floating button
- [ ] Disable `scroll-snap-align` on active section
- [ ] Escape key or back button → destroy `<Canvas>`, restore static preview, re-enable snap
- [ ] Wikilinks work within the section's canvas; cross-section wikilinks render as plain text

#### Canvas Lifecycle Fixes (Required)

- [ ] **d3-zoom cleanup**: Add `select(svg).on('.zoom', null)` to Canvas.svelte unmount cleanup (`Canvas.svelte:792`). Without this, ghost zoom handlers will corrupt store state on remount.
- [ ] **Generation token**: Add `initGeneration` counter to `canvasStore.initialize()` to bail on stale initialization if user switches sections rapidly.
- [ ] **`teardown()` method**: Add lightweight state-clear to `canvasStore` (no API calls) for exiting interactive mode. Current `hardReset()` makes DB calls inappropriate for read-only sites.
- [ ] **Timeout cancellation**: Track the 500ms edit-mode `setTimeout` in Canvas.svelte and `clearTimeout` on unmount.
- [ ] **localStorage guard**: Ensure section canvas IDs use `site-` prefix to prevent `persistState()` from writing to localStorage.

#### Polish (Phase 2)

- [ ] Mobile: `scroll-snap-type: y proximity` on touch devices to prevent fast-flick trapping
- [ ] Keyboard: `PageUp`/`PageDown` navigate sections; `Escape` exits interactive mode
- [ ] `prefers-reduced-motion`: browsers handle scroll-snap natively
- [ ] `content-visibility: auto` on off-screen sections for rendering skip

### Key Constraints

- **Do NOT use `<Canvas>` for previews.** The singleton `canvasStore` cannot serve multiple Canvas instances simultaneously.
- **Use existing `SectionData` types.** Do not create new type hierarchies — the discriminated union at `load-site-sections.ts:37` already works.
- **Vault data includes all notes in a canvas**, even those without card positions. Either filter to only positioned notes before sending to client, or accept all canvas notes are public. Document the decision.
- **`navItems` construction**: Currently comes from `buildLandingCanvasData()`. With the new approach, build nav items from `SectionData[].label` fields directly in the page component.
- **Known TipTap reactive loop** (`docs/solutions/integration-issues/svelte5-tiptap-reactive-loop.md`): The existing fix (decouple `onUpdate` from store) holds under mount/unmount cycles. Verify during implementation.

## Design Direction

Warm palette matching existing codebase (`#f5f3f0`, `#8b7355`, Georgia serif). Canvas previews use inset `box-shadow` vignette overlay with "Explore →" CTA. Cursor changes to `zoom-in` on hover. Discover specific typography, animations, and spacing during implementation.

## Acceptance Criteria

- [ ] Published site shows paginated sections, each full viewport height
- [ ] Scrolling snaps between sections smoothly
- [ ] All section types visible without any clicks (hero, static canvas preview, contact)
- [ ] Clicking a canvas section mounts real `<Canvas>` with interactive pan/zoom/wikilinks
- [ ] Escape or back button exits interactive mode, restores static preview
- [ ] Sticky nav bar shows section names, highlights current section
- [ ] Nav bar auto-hides on scroll down, shows on scroll up
- [ ] Nav click scrolls to section
- [ ] Mobile: swipe navigates sections, pinch zooms in interactive mode
- [ ] No race conditions on rapid section switching (generation token guards)
- [ ] `prefers-reduced-motion` respected
- [ ] All `{@html}` content sanitized via DOMPurify
- [ ] Contact form has rate limiting

## References

### Internal
- `src/lib/server/load-site-sections.ts:44` — `loadSiteSections()` returns per-section data
- `src/lib/server/load-site-sections.ts:190` — `buildLandingCanvasData()` (keep as fallback)
- `src/lib/stores/canvas.svelte.ts:164` — `canvasStore.initialize()`
- `src/lib/components/Canvas.svelte:792` — unmount cleanup (missing d3-zoom detach)
- `src/lib/components/WebsiteContainer.svelte` — current sidebar nav (bypass for new layout)
- `docs/solutions/integration-issues/svelte5-tiptap-reactive-loop.md` — known reactive loop

### External
- [CSS Scroll Snap (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap)
- [Safari fast-flick bug (WebKit #203968)](https://bugs.webkit.org/show_bug.cgi?id=203968)
- [Chrome re-snap after DOM change (Chromium #866127)](https://bugs.chromium.org/p/chromium/issues/detail?id=866127)
