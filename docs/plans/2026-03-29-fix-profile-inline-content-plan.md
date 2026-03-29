---
title: "fix: Profile inline content — conversations with meeting context"
type: fix
status: active
date: 2026-03-29
reviewed: 2026-03-29
---

# Profile Inline Content — Conversations with Meeting Context

Replace the action card grid with a unified view showing conversations with their meeting context inline. Remove back links. Add slot→map deep linking with fuzz region circles.

## Motivation

Conversations and meetings are not separate categories — a meeting is always attached to a conversation. Showing them in one view is more natural than splitting into two sections. The FloatingNav at bottom makes back links redundant. A separate Meetings view with a calendar can come in v0.2.

## Design Review (2026-03-29)

Frontend design review raised these points, incorporated into the plan:

1. **Differentiate by state visually, not with badges.** Published-with-meeting should feel like a confirmation card. Drafts dimmed. Responded items show the other person's authorship. Visual hierarchy communicates lifecycle, not system labels.
2. **Fuzz circle: radial gradient, not hard circle.** Watercolour bleed, not geofence. `--color-success` at 0.08-0.12 opacity, no stroke. Warm and organic, not technical.
3. **Slot→map link via coordinates, not area name.** BottomSheet groups by proximity (berlinDistance), not Bezirk. The "view on map" must use lat/lng coordinates. A small map-pin icon on the SlotCard linking to `/discover?map=true&lat=X&lng=Y&zoom=14`.
4. **"See all" expand with fade-in.** Items stay in place, new items fade in below (opacity 0→1, ~200ms, staggered 50ms per item). Reveal, not layout change.
5. **Profile card becomes clean identity.** Just name + @handle. No stats. The list below IS the activity indicator.
6. **Empty state is the hero.** New users with 0 conversations see a large inviting CTA: "Start your first conversation" with + icon — not a small footnote.
7. **"Responded to" items show other's authorship.** Show the original author's @username prominently — this isn't your conversation, you contributed to someone else's.

## 1. Remove back links from detail pages

- [ ] `src/routes/(app)/conversations/[id]/+page.svelte` — remove back link markup, remove `from` query param logic
- [ ] `src/routes/(app)/meetings/[id]/+page.svelte` — same
- [ ] Archive reference already at `docs/design/archive/back-link-navigation-reference.md`

## 2. Profile: unified conversation list with meeting context

Replace the action card grid with a single list. Each conversation shows its lifecycle state through visual hierarchy, not badges.

**Visual states:**

```
PUBLISHED WITH MEETING (most prominent):
┌─────────────────────────────────────┐
│ [thumb]  Title of conversation      │
│          published · Kreuzberg      │
│  ┌─ Meeting with @tom ────────────┐ │
│  │  Tue 1 Apr · 15:00 · 1 hour   │ │
│  │  Friedrichshain  📍            │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘

PUBLISHED, NO MEETING:
[thumb]  Title of conversation
         published · Kreuzberg

DRAFT (dimmed, opacity):
[thumb]  Title (untitled if empty)
         draft · continue editing →

RESPONDED TO (someone else's):
[thumb]  Title of their conversation
         you responded to @marco's prompt
```

- [ ] Remove action card grid, `expandedSection` state, `back-section-btn`, all action card CSS
- [ ] Create unified list combining authored (published, draft, archived) + responded — sorted by recency
- [ ] For each conversation, join associated meeting data (via prompt_id)
- [ ] Published-with-meeting: show meeting as a warm sub-card (not just a metadata line)
- [ ] Drafts: dimmed (`--opacity-hover-card`), "continue editing →" link to editor
- [ ] Responded: show original author's @username prominently
- [ ] Show first 3 items, "See all N conversations →" to expand with staggered fade-in (200ms, 50ms delay per item)
- [ ] Remove stat numbers from profile card — just name + @handle
- [ ] Empty state: large CTA "Start your first conversation" with + icon, centered, inviting

## 3. Update profile server loader

- [ ] `src/routes/(app)/profile/+page.server.ts` — join meeting data with conversations so each conversation has its meeting context. Currently loaded separately.

## 4. Slot → map deep link + fuzz region

- [ ] `src/lib/components/SlotCard.svelte` — add a clear map icon on the slot card that links to `/discover?map=true&lat=X&lng=Y&zoom=14` using the slot's `general_area_lat/lng` coordinates (NOT area name — BottomSheet groups by proximity, not Bezirk)
- [ ] `src/routes/(app)/discover/+page.svelte` — read `map`, `lat`, `lng`, `zoom` query params on load; auto-switch to map view and set initial center/zoom
- [ ] `src/lib/components/MapView.svelte` — when a conversation is selected (pin click → BottomSheet open), draw a fuzz region around the general_area location:
  - **Radial gradient fill**, not hard-edged circle. Fades from tinted center to transparent edges — watercolour bleed, not geofence
  - Use `--color-success` at 0.08-0.12 opacity for the fill centre, fading to 0
  - 400m radius (matching `FUZZ_MAX_METERS`)
  - No stroke / border
  - Appears when BottomSheet opens, disappears when it closes
  - Use Leaflet's `L.circle` with custom renderer or `L.divIcon` overlay for the gradient effect

## 5. Playwright navigation tests

- [ ] From discover → tap conversation → FloatingNav shows Discover + Profile → tap Discover → back on discover
- [ ] From discover → tap conversation → tap Profile in nav → on profile page
- [ ] From profile → expand conversations → tap conversation → FloatingNav works → tap Profile → back on profile
- [ ] Admin user: admin button visible next to feedback trigger → tap → reaches /admin
- [ ] Editor: FloatingNav shows editor variant (Back, Saved, Continue) at bottom
- [ ] File: `tests/e2e/navigation.responsive.test.ts` (responsive — runs at desktop + mobile)

## Acceptance Criteria

- [ ] No back links on conversation detail or meeting detail pages
- [ ] Profile shows conversations with inline meeting context (visual hierarchy, not badges)
- [ ] Published-with-meeting items show meeting as a warm sub-card
- [ ] Drafts visually dimmed with "continue editing" affordance
- [ ] Responded items show original author prominently
- [ ] First 3 items visible, expand with staggered fade-in
- [ ] Profile card is clean identity (name + handle only)
- [ ] Empty state is a large inviting CTA
- [ ] Slot cards have map-pin icon linking to discover map at coordinates
- [ ] Fuzz region displays as radial gradient (not hard circle) on map when conversation selected
- [ ] Navigation E2E tests pass at desktop + mobile
- [ ] No new svelte-check errors

## Out of Scope

- Calendar view for meetings — v0.2
- Tab-style filtering (published/draft/responded/archived) — v0.2
- Conversation activity indicators — v0.2
