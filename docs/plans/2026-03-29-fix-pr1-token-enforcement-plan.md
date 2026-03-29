---
title: "fix: PR1 — Token enforcement + shared CSS extraction"
type: fix
status: active
date: 2026-03-29
origin: docs/plans/2026-03-29-fix-design-system-enforcement-plan.md
---

# PR1: Token Enforcement + Shared CSS Extraction

Replace all hardcoded CSS values with design tokens. Extract duplicated patterns to shared locations. This is the foundation — without it, every future UI change will re-introduce inconsistencies.

## 1. Define missing tokens in app.css

- [ ] `--opacity-hover-card: 0.72` — for list items, cards, links
- [ ] `--opacity-hover-btn: 0.85` — for buttons, primary actions
- [ ] `--opacity-disabled: 0.5` — for all disabled states
- [ ] `--content-narrow: 560px` — meetings, feedback pages
- [ ] `--content-standard: 700px` — conversation detail, profile, editor
- [ ] `--content-wide: 800px` — discover feed
- [ ] Decide on border-radius gaps: consolidate 8px/16px/20px into existing tokens or add new ones
- [ ] Document dual breakpoint system: 430px (phone layout) + 768px (sidebar visible)

## 2. Replace hardcoded values across all pages

For each page, replace every bare px/rem/hex value with the correct token:

- [ ] `src/routes/(app)/discover/+page.svelte` — 9 font sizes, 5+ spacing values, hover opacity
- [ ] `src/routes/(app)/feedback/[id]/+page.svelte` — 8 font sizes, 8+ spacing values, hardcoded rgba colours
- [ ] `src/routes/(app)/meetings/[id]/+page.svelte` — reveal card CSS, hover opacity
- [ ] `src/routes/(app)/profile/+page.svelte` — stat-label font size, action card spacing, hover opacities
- [ ] `src/routes/(app)/conversations/[id]/+page.svelte` — hover opacity consistency
- [ ] `src/routes/(editor)/conversations/[id]/edit/+page.svelte` — 6 font sizes, 5+ spacing values, border-radius
- [ ] `src/lib/components/BottomSheet.svelte` — 3 font sizes, 4+ spacing values
- [ ] `src/lib/components/FloatingNav.svelte` — day-cell font sizes, hardcoded colours (#1a1a1a, #f5f4f0)
- [ ] `src/lib/components/PublishSheet.svelte` — 6+ font sizes, spacing
- [ ] `src/lib/components/Sidebar.svelte` — font-size 0.9rem, 0.8rem → tokens
- [ ] `src/lib/components/MapView.svelte` — hardcoded border/background colours on markers
- [ ] Replace Bootstrap error/success colours (#dc3545, #198754) with --color-danger/--color-success wherever they appear

## 3. Extract duplicated CSS to shared locations

- [ ] Prompt-row pattern → `shared.css` (.prompt-row, .row-thumb, .thumb-img, .thumb-placeholder, .row-body, .row-title, .row-status) — used in profile, meetings, discover, BottomSheet
- [ ] Reveal card CSS → `shared.css` (.reveal-card, .reveal-noshow, .reveal-quote, .reveal-tags, .reveal-tag) — duplicated in feedback + meetings pages
- [ ] Sign-out section → `shared.css` (.sign-out-section) — duplicated in profile + feedback
- [ ] Textarea base styling → `shared.css` (.form-textarea) — duplicated in conversations, feedback, waitlist
- [ ] Replace local button classes with shared .btn-primary / .btn-secondary: .submit-btn, .btn-accept, .start-prompt-btn, .cancel-btn, .back-btn (8 local definitions)
- [ ] Remove unused CSS: .prompt-actions in discover, .sr-only redefinition in editor

## 4. Consolidate formatDate to dates.ts

- [ ] Add `formatShortDate(iso)` and `formatLongDateTime(iso)` to `src/lib/utils/dates.ts`
- [ ] Replace 7 local formatDate definitions with imports from dates.ts

## 5. Update design system docs

- [ ] Document new tokens added to app.css
- [ ] Document content width tiers (narrow/standard/wide)
- [ ] Document dual breakpoint system
- [ ] Document hover opacity tiers (cards vs buttons)

## Acceptance Criteria

- [ ] Zero hardcoded font sizes — all use --text-* tokens
- [ ] Zero hardcoded spacing — all use --space-* tokens
- [ ] Zero Bootstrap/Tailwind colour values — all use CSS variables
- [ ] All shared patterns extracted (prompt-row, reveal card, buttons, sign-out, textarea)
- [ ] formatDate consolidated (7 → 0 local definitions)
- [ ] Design system docs updated
- [ ] No new svelte-check errors
