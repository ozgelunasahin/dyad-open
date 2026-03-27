---
title: "refactor: Landing page design alignment + remaining design branch elements"
type: refactor
status: active
date: 2026-03-27
---

# Landing Page Design Alignment + Remaining Design Branch Elements

Bring the landing page in line with the design reference branch and integrate remaining design elements (RotatingHeadline, SearchOverlay, ConversationCard) into the app.

## Problem Statement

The design branch (`origin/feat/v0.1-design-work`) has several polished UI elements that we haven't adopted:

1. **RotatingHeadline** — animated cycling through "writers / artists / researchers / people with questions / you ... in conversation" on the landing page. Currently we have a static "What would you talk about with a stranger?"
2. **Landing page layout** — design branch uses a split-screen (50/50 grid): left column with hero content pinned to bottom, right column with scrollable conversation cards. Our current landing page is a different layout.
3. **SearchOverlay** — full-screen search overlay triggered from the FloatingNav search pill. Currently the search pill is disabled.
4. **ConversationCard** — card component for the landing page right column showing cover image, neighbourhood, date, title, excerpt.
5. **Login/Join modals** — design branch uses modal overlays on the landing page instead of separate `/login` and `/join` routes.

## Proposed Solution

### Phase 1: RotatingHeadline Component

Already written (stashed). Cycles through stakeholder words with fade-and-slide animation.

**Component:** `src/lib/components/RotatingHeadline.svelte`
- Words: `['writers', 'artists', 'researchers', 'people with questions', 'you']`
- Interval: 2800ms, transition: 420ms fade+slide
- Headline: `{word}\n in conversation`
- Font: `clamp(3.2rem, 5.5vw, 6rem)`, weight normal, line-height 0.92
- Mobile: `font-size: 11vw`

### Phase 2: Landing Page Redesign

Rewrite `src/routes/+page.svelte` to match the design branch layout:

- [ ] **Split-screen layout**: `grid-template-columns: 1fr 1fr`, full viewport height
- [ ] **Left column** (fixed hero):
  - Logo top-left, "log in" link top-right (monospace, 11px, uppercase)
  - Hero content pinned to bottom: RotatingHeadline, tagline ("cultivating a culture of conversation" with left border), city row (pulsing green dot + "BERLIN" monospace), "join waitlist →" button
  - Footer: theme toggle, legal links
- [ ] **Right column** (scrollable): conversation cards from published prompts
- [ ] **Mobile**: single column, hero at top, cards below
- [ ] **Login modal**: overlay on landing page (not `/login` redirect) — design uses `fade` backdrop + `fly` modal
- [ ] **Join modal**: overlay with freewrite form, city typeahead, expression URL

### Phase 3: ConversationCard Component

New component for the landing page right column:

- [ ] `src/lib/components/ConversationCard.svelte`
- [ ] Cover image thumbnail (or placeholder)
- [ ] Neighbourhood label (monospace, uppercase)
- [ ] Date
- [ ] Title
- [ ] Body excerpt (plain text, truncated)
- [ ] Click opens join modal (for anonymous users)

### Phase 4: SearchOverlay (Placeholder)

The design branch has a full-screen search overlay. For v0.1 this is a placeholder (search not functional), but the UI should exist:

- [ ] `src/lib/components/SearchOverlay.svelte`
- [ ] Full-screen overlay with fade transition
- [ ] Search input with autofocus
- [ ] Suggestion chips: "strangers & connection", "philosophy of everyday life", etc.
- [ ] Results rendered from client-side text matching (not a backend search)
- [ ] Wire to FloatingNav search pill (replace disabled pill with functional overlay trigger)

### Phase 5: Design System Integration

Update `docs/design/design-system.md` with:

- [ ] Landing page layout rules (split-screen, hero positioning)
- [ ] Modal patterns (backdrop fade, modal fly, form layout)
- [ ] Animation: RotatingHeadline timing, city pulse keyframes
- [ ] ConversationCard as a documented component pattern

## Files Changed

| File | Change |
|------|--------|
| `src/lib/components/RotatingHeadline.svelte` | **New** (already written, stashed) |
| `src/lib/components/ConversationCard.svelte` | **New** — landing page card |
| `src/lib/components/SearchOverlay.svelte` | **New** — full-screen search |
| `src/routes/+page.svelte` | Major rewrite — split layout, modals, RotatingHeadline |
| `src/routes/+page.server.ts` | May need to serve published prompts for right column |
| `src/lib/components/FloatingNav.svelte` | Wire search pill to SearchOverlay |
| `docs/design/design-system.md` | Add landing page, modal, animation patterns |

## Technical Considerations

- **SSR**: Landing page must render server-side for SEO. RotatingHeadline starts after hydration (onMount).
- **Auth on landing**: Design branch creates a Supabase client on the landing page for login. Our current setup redirects to `/login`. Need to decide: keep modals (design branch approach) or keep separate routes.
- **Logo URL**: Design branch uses a Supabase storage URL for the logo. We should use `/images/logo.png` (self-hosted, sovereignty).
- **Data for right column**: Need published prompts on the landing page. The current `+page.server.ts` already loads them via `getPublishedPrompts`.

## Acceptance Criteria

- [ ] Landing page shows rotating headline animation
- [ ] Split-screen layout on desktop, single column on mobile
- [ ] Conversation cards in right column from published prompts
- [ ] Login and join work from the landing page (modals or routes)
- [ ] Search overlay opens from FloatingNav pill
- [ ] Design system doc updated with new patterns
- [ ] Build passes, tests pass
- [ ] Matches design reference screenshots

## Sources

- Design branch: `origin/feat/v0.1-design-work`
- Components: `RotatingConversationHeadline.svelte`, `ConversationCard.svelte`, `SearchOverlay.svelte`
- Landing page: `git show origin/feat/v0.1-design-work:src/routes/+page.svelte`
- Design system: `docs/design/design-system.md`
- Design screenshots: `docs/design/ref-*.jpg`
