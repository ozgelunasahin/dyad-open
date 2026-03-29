---
title: "fix: PR1 — Token enforcement + shared CSS extraction"
type: fix
status: active
date: 2026-03-29
origin: docs/plans/2026-03-29-fix-design-system-enforcement-plan.md
reviewed: 2026-03-29
---

# PR1: Token Enforcement + Shared CSS Extraction

Replace all hardcoded CSS values with design tokens. Extract duplicated patterns to shared locations. This is the foundation — without it, every future UI change will re-introduce inconsistencies.

## Review Findings (2026-03-29)

Reviewed by: code-simplicity-reviewer, architecture-strategist.

**Changes from initial plan:**
1. Removed formatDate consolidation — it's a JS concern, not CSS. Separate PR.
2. Removed Bootstrap colour replacement — those only exist in auth pages (PR3 scope).
3. Border-radius: no new tokens needed. Replace hardcoded values with nearest existing token.
4. Moved breakpoint documentation to Section 4 (docs), not Section 1 (tokens).
5. Tightened acceptance criteria — specific about what "hardcoded" means.

## 1. Define missing tokens in app.css

- [ ] `--opacity-hover-card: 0.72` — for list items, cards, links
- [ ] `--opacity-hover-btn: 0.85` — for buttons, primary actions
- [ ] `--opacity-disabled: 0.5` — for all disabled states
- [ ] `--content-narrow: 560px` — meetings, feedback pages
- [ ] `--content-standard: 700px` — conversation detail, profile, editor
- [ ] `--content-wide: 800px` — discover feed

## 2. Replace hardcoded values across (app) and component files

For each file, replace bare px/rem font sizes with `--text-*` tokens, bare spacing with `--space-*` tokens, hardcoded colours with CSS variables, and hardcoded border-radius with nearest existing token (`--radius-input` 6px, `--radius-card` 12px, or `--radius-pill` 999px).

**Does NOT include auth pages** (login, join, waitlist) — those are PR3.

- [ ] `src/routes/(app)/discover/+page.svelte` — font sizes, spacing, hover opacity
- [ ] `src/routes/(app)/feedback/[id]/+page.svelte` — font sizes, spacing, colours, border-radius
- [ ] `src/routes/(app)/meetings/[id]/+page.svelte` — reveal card, hover opacity
- [ ] `src/routes/(app)/profile/+page.svelte` — stat-label size, action card spacing, opacities
- [ ] `src/routes/(app)/conversations/[id]/+page.svelte` — hover opacity
- [ ] `src/routes/(editor)/conversations/[id]/edit/+page.svelte` — font sizes, spacing, border-radius
- [ ] `src/lib/components/BottomSheet.svelte` — font sizes, spacing
- [ ] `src/lib/components/FloatingNav.svelte` — day-cell sizes, hardcoded colours → tokens
- [ ] `src/lib/components/PublishSheet.svelte` — font sizes, spacing
- [ ] `src/lib/components/Sidebar.svelte` — font sizes
- [ ] `src/lib/components/MapView.svelte` — marker colours → CSS variables

## 3. Extract duplicated CSS to shared.css

- [ ] Prompt-row pattern → shared.css (.prompt-row, .row-thumb, .thumb-img, .thumb-placeholder, .row-body, .row-title, .row-status) — used in profile, meetings, discover
- [ ] Reveal card CSS → shared.css (.reveal-card, .reveal-noshow, .reveal-quote, .reveal-tags, .reveal-tag) — duplicated in feedback + meetings
- [ ] Replace local button classes with shared .btn-primary / .btn-secondary: .submit-btn, .btn-accept, .start-prompt-btn, .cancel-btn, .back-btn
- [ ] Remove unused CSS: .prompt-actions in discover

## 4. Update design system docs

- [ ] Document newly-added tokens (opacity, content-width) in design-system.md
- [ ] Document hover opacity tiers (cards vs buttons)
- [ ] Document content width tiers (narrow/standard/wide)
- [ ] Document dual breakpoint system: 430px (phone layout) + 768px (sidebar visible)

## Acceptance Criteria

- [ ] No bare px/rem font-size values in (app) routes or components — all use `--text-*` tokens
- [ ] No bare px/rem margin/padding/gap values (above 2px) in (app) routes or components — all use `--space-*` tokens
- [ ] No hardcoded hex colours in (app) routes or components — all use CSS variables
- [ ] All shared patterns extracted (prompt-row, reveal card, buttons)
- [ ] All newly-added tokens documented in design-system.md
- [ ] No new svelte-check errors
