---
title: "fix: Navigation consistency — remove sidebar, FloatingNav everywhere"
type: fix
status: completed
date: 2026-03-29
reviewed: 2026-03-29
---

# Navigation Consistency — Remove Sidebar, FloatingNav Everywhere

Remove the desktop sidebar. Use FloatingNav as the single navigation system on all viewports. Pin it to the bottom. This is one concern: collapsing a dual navigation system into one.

**Profile page inline previews are a separate PR** (different concern, independently reviewable).

## Motivation

"Enabler, not replacement — get people into rooms, not keep them on screens" (design-principles.md). The current dual nav (sidebar on desktop + FloatingNav on mobile) creates inconsistency. Collapsing to one system is simpler for users and for the codebase.

## Review Findings (2026-03-29)

Reviewed by: architecture-strategist, code-simplicity-reviewer.

**Resolved:**
1. Split into 2 PRs: nav consistency (this plan) + profile redesign (separate plan)
2. Removed 4 folded-in todos — separate concerns
3. Admin navigation gap: add admin link to profile page
4. Editor Continue dropdown must flip upward (would go off-screen with bottom nav)
5. Date filter: keep in FloatingNav discover variant
6. Don't add Discover icon to discover variant — user is already on discover
7. Sign-out: only on profile page — standard PWA behaviour
8. @username indicator lost — accepted for alpha

## 1. Remove sidebar from all layouts

- [ ] `src/routes/(app)/+layout.svelte` — remove Sidebar import, remove flex wrapper, make main-content full-width
- [ ] `src/routes/(editor)/+layout.svelte` — same
- [ ] `src/routes/(admin)/admin/+layout.svelte` — same

## 2. FloatingNav: always bottom, visible on all viewports

- [ ] Change default `position` prop from `'top'` to `'bottom'`
- [ ] Remove `.default-variant { display: none }` on desktop
- [ ] Remove desktop sidebar offset (`left: calc(50% + 90px)`) from FloatingNav, date-panel, clear-dates
- [ ] Remove desktop sidebar offset from BottomSheet
- [ ] Remove `.map-pane { left: 180px }` from discover page

## 3. Editor Continue dropdown: flip direction

- [ ] Change `.continue-dropdown` from `top:` to `bottom:` so it opens upward

## 4. Fix page spacing

- [ ] Discover: remove `padding-top: 64px`, add `padding-bottom: 80px`
- [ ] Profile: remove mobile `padding-top: 64px` (already has padding-bottom)
- [ ] Editor: remove `padding-top: 72px`, add `padding-bottom: 80px`
- [ ] Audit all other (app) pages

## 5. Admin button next to feedback button

- [ ] `src/lib/components/FeedbackModal.svelte` (or wherever the "?" trigger is) — add an admin icon/link to `/admin` next to the feedback button, conditional on `isAdmin`. Same fixed bottom-right positioning. Admin users see two buttons: [?] [admin]. This keeps the admin tool one tap away for the co-founder who uses it daily.
- [ ] Thread `isAdmin` prop through to whatever component renders the admin button. The layout data already has it from `loadLayoutData`.

## 6. Update design system docs + archive sidebar

- [ ] Rewrite Layout section in design-system.md: remove sidebar, document FloatingNav as sole nav (bottom)
- [ ] Update FloatingNav component spec: position bottom, visible on all viewports
- [ ] Archive sidebar styling: `docs/design/archive/sidebar-desktop-nav-reference.md` (already created)
- [ ] Add to ROADMAP.md: "v0.2 — revisit desktop navigation (top bar, horizontal nav, or sidebar revival)"

## Acceptance Criteria

- [ ] No sidebar rendered anywhere
- [ ] FloatingNav visible at bottom on all pages, both viewports
- [ ] No padding-top for nav clearance
- [ ] Map fills full viewport width
- [ ] Editor dropdown opens upward
- [ ] Admin users can reach /admin via button next to feedback "?" button
- [ ] Design system docs updated, sidebar archived
- [ ] ROADMAP notes desktop nav revisit for v0.2
- [ ] No new svelte-check errors
