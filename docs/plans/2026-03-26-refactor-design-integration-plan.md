---
title: "refactor: Integrate design work from Ozge's PRs"
type: refactor
status: completed
date: 2026-03-26
---

# Integrate Design Work from Ozge's PRs

Adopt the visual design patterns from `feat/v0.1-design-work` (PR #27) and `feat/v0.1-design-profile` (PR #28) into the current prompt-domain app. The design branches use the old canvas data model — we take the CSS and visual patterns, not the data wiring.

## What to Adopt

### 1. FloatingNav — Mobile Navigation Pill

**Source:** `feat/v0.1-design-work:src/lib/components/FloatingNav.svelte` (336 lines)

The floating pill-shaped nav is the core mobile navigation pattern. It replaces the current sidebar hamburger menu on mobile with a fixed bottom pill containing: Map toggle, Date filter, Search (defer), Start conversation, Profile.

**Adaptation needed:**
- [ ] Replace `Conversation` type references with `PromptSummary`
- [ ] Replace `SearchOverlay` import with a stub or defer search entirely (not in v0.1 scope)
- [ ] Replace `/dashboard` links with `/profile`
- [ ] Replace "conversation" terminology — already done in domain language, but verify icon labels
- [ ] Replace hardcoded Supabase storage URLs with self-hosted paths
- [ ] Wire `onMapClick` to the existing `viewMode` toggle on discover page
- [ ] Wire `onToggleDay` to existing date filter state
- [ ] Wire `showCreate` button to `/prompts/new`

**Where it goes:**
- Discover page (mobile): bottom floating pill with Map/Date/Create/Profile
- Map view: same pill but with "List" toggle instead of "Map"
- Editor page: editor variant with Back/Save status/Continue (defer to later)

### 2. Discover Page Card Styling

**Source:** `feat/v0.1-design-work:src/routes/discover/+page.svelte` — card row CSS

Our current discover cards already have most of Ozge's patterns (88px thumbnails, meta row, snippet clamp). The main differences:
- [ ] Hover effect: Ozge uses expanding padding with background instead of opacity change
- [ ] Thumbnail: Ozge uses absolute-positioned img inside a relative container with `align-self: stretch`
- [ ] Row gap: Ozge uses `1.25rem` gap, we use similar
- [ ] Date filter panel: Ozge's has frosted glass background (`backdrop-filter: blur(12px)`)

**Minimal changes needed — our discover CSS is already close.**

### 3. Profile Page Styling

**Source:** `feat/v0.1-design-profile:src/routes/profile/+page.svelte` (3053 lines — massive)

The profile design branch has a very different profile page with:
- Avatar upload with edit overlay
- Display name inline editing
- Stats row (Active, Meetings, Saved)
- Airbnb-style action cards (grid layout with stacked cover images)
- Follow/follower counts (not in our scope)

**What to adopt:**
- [ ] Profile header card pattern (avatar + display name + stats)
- [ ] Action card grid layout for prompts
- [ ] State badges (draft/published/archived) styling

**What NOT to adopt:**
- Avatar upload (separate feature — needs migration for avatar_url column)
- Display name editing (needs profile API endpoint)
- Follow/follower system (not in v0.1)
- Bookmarks (not in v0.1)

### 4. Shared CSS Patterns

**Source:** Both design branches + best-practices research

The earlier CSS research identified significant duplication across login/join/waitlist pages (split-layout, form styles, image grain overlay). Extracting shared patterns:

- [ ] Create `src/lib/styles/split-layout.css` — shared by login, join, waitlist pages
- [ ] Create `src/lib/styles/form.css` — shared form styles (submit button, error messages, field groups)
- [ ] Consolidate hardcoded colours into CSS tokens already added (--color-success, --color-danger, etc.)

### 5. General Visual Polish

Across all pages, apply Ozge's consistent visual language:
- [ ] Border radius: use `--radius-card` (12px), `--radius-input` (6px), `--radius-pill` (999px) tokens
- [ ] Hover effects: standardise to `opacity: 0.72` for list items, `opacity: 0.85` for buttons
- [ ] Transitions: standardise to `0.15s ease`
- [ ] Thumbnail pattern: `88px × 96px` with absolute-positioned image, placeholder with `--bg-control`
- [ ] Mobile breakpoint: consistently `430px` (matching Ozge's breakpoint)

## Implementation Steps

### Step 1: Adapt FloatingNav for prompt domain

- [ ] Copy `FloatingNav.svelte` from design branch
- [ ] Replace `Conversation` type with `PromptSummary` (or make it generic)
- [ ] Remove `SearchOverlay` dependency (search is not in v0.1)
- [ ] Fix URLs: `/dashboard` → `/profile`, Supabase storage → self-hosted
- [ ] Add to discover page (mobile only): replace hamburger menu trigger with FloatingNav
- [ ] Wire props: `onMapClick`, `onToggleDay`, `weekDates`, `selectedDays`

### Step 2: Extract shared CSS

- [ ] Create `src/lib/styles/split-layout.css` from login/join/waitlist shared patterns
- [ ] Create `src/lib/styles/form.css` from shared form patterns
- [ ] Import in the three pages, remove duplicated CSS

### Step 3: Polish discover cards

- [ ] Adopt Ozge's frosted-glass date filter panel
- [ ] Refine hover effect (expanding padding with background)
- [ ] Ensure thumbnail pattern matches exactly

### Step 4: Polish profile page

- [ ] Adopt action card grid layout for prompts (instead of simple list)
- [ ] Better state badges
- [ ] Invitation cards styling

### Step 5: Polish remaining pages

- [ ] Prompt detail: typography, slot cards, response form
- [ ] Editor: toolbar, scheduling section
- [ ] Meeting detail: detail grid
- [ ] Feedback form: tag pills, step layout
- [ ] Landing page: any remaining differences from Ozge's version

### Step 6: Verify

- [ ] Build passes, tests pass
- [ ] All pages visually consistent
- [ ] FloatingNav works on mobile discover/map
- [ ] No hardcoded Supabase URLs remaining
- [ ] Mobile responsive at 430px breakpoint

## What NOT to Do

- **Don't adopt SearchOverlay** — search is not in v0.1 scope
- **Don't adopt avatar upload** — needs migration + profile API
- **Don't adopt follow/follower system** — not in v0.1
- **Don't adopt bookmarks** — not in v0.1
- **Don't adopt the profile migration** (display_name, avatar_url columns) — separate PR if needed

## Sources

- **Design branches:** `feat/v0.1-design-work` (PR #27), `feat/v0.1-design-profile` (PR #28)
- **Earlier CSS research:** Best-practices agent findings on CSS architecture, shared patterns, token system
- **CSS tokens:** Already in `src/app.css` — `--color-success`, `--color-danger`, `--radius-*`
- **Brainstorm:** `docs/brainstorms/2026-03-25-frontend-v01-core-journey-brainstorm.md` — "Adapt designs for the prompt domain model"
