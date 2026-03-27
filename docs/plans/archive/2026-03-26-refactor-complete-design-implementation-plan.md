---
title: "refactor: Complete design implementation from Ozge's PRs"
type: refactor
status: revised
date: 2026-03-26
supersedes:
  - docs/plans/2026-03-26-feat-map-view-discover-plan.md
  - docs/plans/2026-03-26-feat-map-view-fuzzed-locations-plan.md
  - docs/plans/2026-03-26-refactor-editor-redesign-plan.md
---

# Complete Design Implementation

Properly integrate Ozge's design work from `feat/v0.1-design-work` (PR #27) and `feat/v0.1-design-profile` (PR #28) into the current app. This replaces the incremental patches that created conflicts (e.g. FloatingNav on top of sidebar).

## The Fundamental Problem

Ozge's design has **no shared layout**. Each page manages its own sidebar + FloatingNav. The sidebar is desktop-only (>768px), FloatingNav is mobile-only (<=768px). They're mutually exclusive by breakpoint.

Our current `(app)/+layout.svelte` provides a shared sidebar on ALL pages, and we layered FloatingNav on top without removing the sidebar. This creates double navigation.

## Architecture Decision

**Remove layout markup from `(app)/+layout.svelte`.** Keep it as an auth guard + data loader only (rendering `{@render children()}` with no wrapper elements). Each page manages its own navigation — matching Ozge's architecture exactly.

This means:
- Each page under `(app)/` renders its own sidebar (desktop) + FloatingNav (mobile)
- The sidebar HTML/CSS lives in a shared Svelte component (`AppShell.svelte`) imported per-page — NOT in the layout
- Pages that don't need the sidebar (e.g. editor) simply don't import it
- The `mobile-only` utility class in `app.css` controls visibility at the 768px breakpoint

## Reference Screenshots

- `docs/design/photo_2026-03-26_16-02-50.jpg` — Profile: avatar, stats, action cards, FloatingNav bottom
- `docs/design/photo_2026-03-26_16-03-25.jpg` — Conversation detail: cover image, title, body, action bar
- `docs/design/photo_2026-03-26_16-03-31.jpg` — Discover list: FloatingNav top pill, card rows with thumbnails
- `docs/design/photo_2026-03-26_16-03-36.jpg` — Map view: full screen, dark circle pins, FloatingNav bottom
- `docs/design/photo_2026-03-26_16-06-41.jpg` — Editor empty: FloatingNav editor variant, cover placeholder, title, body
- `docs/design/photo_2026-03-26_16-07-32.jpg` — Editor with content: save/publish dropdown
- `docs/design/photo_2026-03-26_16-07-38.jpg` — Publish modal: bottom sheet, day picker, time/location

## Implementation Steps

### Step 1: Extract shared navigation into components

- [ ] Create `src/lib/components/AppSidebar.svelte` — the desktop sidebar (logo, nav links, username, sign out). Extracted from the current `(app)/+layout.svelte`. Props: `username`, `activePath`.
- [ ] Update `FloatingNav.svelte` — ensure it matches Ozge's patterns exactly. Two variants: `default` (map/calendar/search spacer/+/profile) and `editor` (back/saved/continue).
- [ ] Add `mobile-only` CSS utility to `app.css` if not already present: `display: none` above 768px, `display: contents` below.
- [ ] Strip `(app)/+layout.svelte` down to auth guard + data loader + bare `{@render children()}`. No sidebar, no `app-layout` div, no navigation markup.

### Step 2: Rework discover page

Match `docs/design/photo_2026-03-26_16-03-31.jpg` (list) and `photo_2026-03-26_16-03-36.jpg` (map):

- [ ] Import `AppSidebar` for desktop, `FloatingNav` for mobile
- [ ] Layout: `<div class="app-layout">` + inline sidebar + main content
- [ ] Desktop: sidebar visible, FloatingNav hidden
- [ ] Mobile: FloatingNav visible (top position for list, bottom for map), sidebar hidden
- [ ] FloatingNav wired to: map/list toggle, date filter, create link, profile link
- [ ] Remove the current inline filter bar (When/Where) — FloatingNav's date filter replaces it on mobile; on desktop, keep a simplified filter bar inside the main content area
- [ ] Card rows: match Ozge's thumbnail pattern (88×96px absolute-positioned image)
- [ ] Map view: full screen (`100vh - nav height`), no zoom controls, center on user location

### Step 3: Rework profile page

Match `docs/design/photo_2026-03-26_16-02-50.jpg`:

- [ ] Import `AppSidebar` for desktop, `FloatingNav` for mobile (bottom position, `active="profile"`)
- [ ] Profile header card: avatar placeholder + stats (Active count, Meetings count)
- [ ] Action cards grid (2×2): Conversations (with active indicator), Meetings, Archive
- [ ] Each card shows stacked cover image thumbnails
- [ ] Click navigates to filtered views

### Step 4: Rework editor page

Match `docs/design/photo_2026-03-26_16-06-41.jpg`, `photo_2026-03-26_16-07-32.jpg`, `photo_2026-03-26_16-07-38.jpg`:

- [ ] NO sidebar, NO standard FloatingNav — use FloatingNav `variant="editor"` only
- [ ] Editor variant: ← Back, • Saved indicator, Continue button (all screen sizes)
- [ ] Cover photo: dashed-border placeholder ("Add a cover photo — Required. Click or drag an image"), click/drag to upload
- [ ] Title: large serif placeholder ("Title"), no label
- [ ] @username badge below title
- [ ] Body: clean writing view, "Start writing..." placeholder, no visible toolbar
- [ ] "Continue" button opens dropdown: "Save as Draft" / "Publish as Conversation"
- [ ] "Publish as Conversation" opens bottom sheet modal: day picker, time + duration per selected day, location input, Publish button
- [ ] Remove current inline scheduling section and publish button

### Step 5: Rework conversation detail page

Match `docs/design/photo_2026-03-26_16-03-25.jpg`:

- [ ] Full-width cover image at top
- [ ] @author + date below image
- [ ] Title in large serif
- [ ] Body text
- [ ] Bottom action bar: bookmark icon (defer), response count, "invite to meet" button (enabled after response), share (defer)
- [ ] Response section below (current response-first flow stays)

### Step 6: Remaining pages

- [ ] Meeting detail: clean layout matching design language
- [ ] Feedback form: clean layout matching design language
- [ ] Landing page: already matches (split layout from PR #2)

### Step 7: Shared CSS cleanup

- [ ] Extract `src/lib/styles/split-layout.css` from login/join/waitlist
- [ ] Extract `src/lib/styles/form.css` shared form patterns
- [ ] Standardise border-radius to CSS tokens
- [ ] Standardise hover/transition effects

### Step 8: Verify

- [ ] Build passes, tests pass
- [ ] No double navigation on any page
- [ ] Desktop: sidebar visible, FloatingNav hidden
- [ ] Mobile (<=430px): sidebar hidden, FloatingNav visible
- [ ] Editor: FloatingNav editor variant only, no sidebar
- [ ] All reference screenshots approximately matched
- [ ] Map view: full screen, pins work, bottom sheet works

## Breakpoint Behaviour (from Ozge's design)

| Breakpoint | Sidebar | FloatingNav | Layout |
|---|---|---|---|
| >768px | Visible (180px sticky) | Hidden | Sidebar + content |
| 431-768px | Collapsed (logo + hamburger) | Visible | Full-width content |
| <=430px | Hidden | Visible | Full-width content |

## Acceptance Criteria

- [ ] Each page manages its own navigation (no shared layout markup)
- [ ] `(app)/+layout.svelte` is auth guard + data only
- [ ] Sidebar and FloatingNav are mutually exclusive by breakpoint
- [ ] Editor uses FloatingNav editor variant (no sidebar)
- [ ] Discover matches screenshots (list + map views)
- [ ] Profile matches screenshot (header + action cards)
- [ ] Editor matches screenshots (clean writing + publish modal)
- [ ] Conversation detail matches screenshot (cover + body + action bar)
- [ ] Build passes, tests pass

## Sources

- **Design branches:** `feat/v0.1-design-work` (PR #27), `feat/v0.1-design-profile` (PR #28)
- **Reference screenshots:** `docs/design/photo_2026-03-26_16-*.jpg`
- **Research:** Deep comparison of design branch architecture (each page self-contained, no shared layout)
- **Parent plan:** `docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md`
