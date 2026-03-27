---
title: "feat: Search overlay from FloatingNav"
type: feat
status: active
date: 2026-03-27
---

# Search Overlay from FloatingNav

Add a full-screen search overlay triggered from the FloatingNav search pill. Client-side text matching against published prompts — no backend search endpoint needed.

## Overview

The design branch has a `SearchOverlay.svelte` component: full-screen overlay with a large centered search input, suggestion chips below, and results as conversation rows. The FloatingNav already has a disabled search pill — this PR replaces it with a functional trigger.

Search is client-side only: the discover page already loads all published prompts, so search filters the existing dataset by matching query words against title and body snippet. No API needed.

## Changes

### 1. SearchOverlay Component

`src/lib/components/SearchOverlay.svelte` — adapted from design branch.

- [ ] Full-screen overlay (`position: fixed`, `inset: 0`, z-index 900)
- [ ] Fade transition on open/close (180ms)
- [ ] Large centered search input (`clamp(2rem, 10vw, 3.5rem)`, weight 300, centered)
- [ ] Close button (×) top-right
- [ ] Escape key closes
- [ ] Enter key submits search

**Before search:**
- [ ] Suggestion chips below input: "strangers & connection", "philosophy of everyday life", "art and who makes it", "what we owe each other", "living in Berlin"
- [ ] Clicking a chip fills and submits

**After search:**
- [ ] Results: conversation rows with cover thumb, title, snippet
- [ ] Click result navigates to `/prompts/[id]`
- [ ] "No conversations found." for empty results

**Scoring:** word-based matching. Each query word scores 3 for title match, 1 for snippet match. Results sorted by score descending.

**Data:** accepts `PromptSummary[]` — same data the discover page already has.

### 2. FloatingNav Integration

`src/lib/components/FloatingNav.svelte`:

- [ ] Replace disabled search pill with functional button
- [ ] Add `onSearchClick` prop
- [ ] Remove `cursor: not-allowed` and `opacity: 0.7` from search pill
- [ ] Discover page passes `onSearchClick` to open overlay, passes `filteredPrompts` as search data

### 3. Discover Page Wiring

`src/routes/(app)/discover/+page.svelte`:

- [ ] Import SearchOverlay
- [ ] Add `searchOpen` state
- [ ] Wire FloatingNav `onSearchClick` → `searchOpen = true`
- [ ] Pass `data.prompts` to SearchOverlay
- [ ] Result click navigates to conversation detail

### 4. Design System Update

`docs/design/design-system.md`:

- [ ] SearchOverlay spec: layout, input sizing, suggestion chips, result rows
- [ ] Add to Animations section: overlay fade 180ms, results fly 180ms

## Files Changed

| File | Change |
|------|--------|
| `src/lib/components/SearchOverlay.svelte` | **New** |
| `src/lib/components/FloatingNav.svelte` | Wire search pill, add `onSearchClick` prop |
| `src/routes/(app)/discover/+page.svelte` | Add search state + overlay |
| `docs/design/design-system.md` | SearchOverlay spec |

## Acceptance Criteria

- [ ] Search pill in FloatingNav opens full-screen overlay
- [ ] Suggestion chips shown before search
- [ ] Typing + Enter searches title and snippet
- [ ] Results show cover, title, snippet
- [ ] Click result navigates to conversation detail
- [ ] Escape closes overlay
- [ ] Works on mobile (full-screen)
- [ ] Build passes, tests pass

## Sources

- Design branch: `git show origin/feat/v0.1-design-work:src/lib/components/SearchOverlay.svelte`
- FloatingNav: `src/lib/components/FloatingNav.svelte`
- Design system: `docs/design/design-system.md`
