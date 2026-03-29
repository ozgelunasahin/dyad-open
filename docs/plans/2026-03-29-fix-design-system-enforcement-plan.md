---
title: "fix: Design system enforcement — visual consistency pass"
type: fix
status: active
date: 2026-03-29
origin: design review by 4 agents (architecture, pattern, simplicity, explore)
---

# Design System Enforcement

The frontend has accumulated significant design inconsistencies. 4 review agents found 23+ categories of issues. This plan scopes the fixes into focused PRs.

## Problem Summary

1. **25+ hardcoded font sizes** for 8 defined tokens — typography has no discipline
2. **3 competing colour systems** — design tokens (#3d9e5a, #c00), Bootstrap (#dc3545, #198754), Tailwind (#22c55e)
3. **~475 lines of duplicated CSS** — auth pages (~300), prompt-row (~50), reveal cards, buttons
4. **6+ different hover opacities** — 0.70, 0.72, 0.80, 0.82, 0.85, 0.90
5. **7 border-radius values** for 3 defined tokens — 4px, 8px, 10px, 16px, 20px undocumented
6. **8 local button definitions** that duplicate shared .btn-primary/.btn-secondary
7. **7 local formatDate functions** that duplicate dates.ts
8. **Sign-out visible twice on desktop** — sidebar + profile page
9. **Green badge uses wrong colour** (#22c55e Tailwind vs #3d9e5a design token) and different animation than landing
10. **Green badge never clears** — shows when allConversations.length > 0, not "new/needs attention"
11. **Auth pages (login, join, waitlist) are a separate design dialect** — different radius, colours, focus states, spacing
12. **Feedback form still a blocking modal** — should be corner popover (todo #101)
13. **Admin can't archive feedback** — needs "mark as actioned" capability

## Phased Approach

### Phase 1: Token enforcement + shared CSS extraction

The foundation — without this, every other fix will re-introduce inconsistencies.

**CSS tokens:**
- [ ] Replace all hardcoded font sizes with nearest token (or add new tokens if gaps in scale)
- [ ] Replace all hardcoded spacing with --space-* tokens
- [ ] Replace all hardcoded colours with CSS variables (especially Bootstrap/Tailwind colours in auth pages)
- [ ] Define missing tokens: --opacity-hover-card (0.72), --opacity-hover-btn (0.85), --opacity-disabled (0.5)
- [ ] Define missing radius tokens if needed (decide: consolidate 8px/16px/20px into existing or add new)
- [ ] Define content width tokens: --content-narrow (560px), --content-standard (700px), --content-wide (800px)
- [ ] Document the dual breakpoint system: 430px (phone layout) + 768px (sidebar visible)

**Shared CSS extraction:**
- [ ] Extract auth split-layout to shared (or an (auth) layout group) — eliminates ~300 duplicated lines
- [ ] Extract prompt-row pattern (.prompt-row, .row-thumb, .thumb-img, .row-body, .row-title, .row-status) to shared.css
- [ ] Extract reveal card CSS to shared.css (or create RevealCard.svelte)
- [ ] Extract .sign-out-section to shared.css
- [ ] Extract textarea base styling to shared.css
- [ ] Replace local button classes (.submit-btn, .btn-accept, .start-prompt-btn, .cancel-btn, .back-btn) with shared .btn-primary / .btn-secondary
- [ ] Consolidate formatDate into src/lib/utils/dates.ts (7 copies → imports)
- [ ] Remove unused CSS (.prompt-actions in discover, .sr-only redefinition in editor)

### Phase 2: Profile page + badge + sign-out

Specific visual fixes the user flagged.

- [ ] Fix green badge colour: replace #22c55e with var(--color-success) throughout profile
- [ ] Unify pulse animation: use opacity-based pulse (matching landing page), not box-shadow ring
- [ ] Fix badge clearing logic: conversations badge should show for "needs attention" items (invitations, feedback due), not "any conversations exist"
- [ ] Fix action card alignment: use token-based padding, consistent border-radius
- [ ] Remove sign-out from profile page on desktop (sidebar provides it) — keep on mobile where sidebar is hidden
- [ ] Fix profile card border-radius: decide on token or add --radius-card-lg

### Phase 3: Auth pages alignment

Bring login, join, waitlist into the design system.

- [ ] Replace border-radius: 4px with var(--radius-input)
- [ ] Replace Bootstrap error/success colours with --color-danger/--color-success
- [ ] Replace focus border-color from --text-link-hover to --text-muted (design system spec)
- [ ] Replace hardcoded rem sizes with design tokens
- [ ] Replace disabled opacity 0.6 with 0.5 (matching design system)
- [ ] Extract shared auth layout to avoid tripling the CSS

### Phase 4: Functional fixes

- [ ] Feedback form: convert from blocking modal to corner popover (todo #101)
- [ ] Admin: add "mark as actioned" / archive capability for feedback reports

### Phase 5: Design system docs update

- [ ] Document all new tokens added
- [ ] Document dual breakpoint system (430px + 768px)
- [ ] Document content width tiers
- [ ] Document hover opacity tiers (cards vs buttons)
- [ ] Add badge/indicator section (when to use each pattern)

## Acceptance Criteria

- [ ] Zero hardcoded font sizes — all use --text-* tokens
- [ ] Zero hardcoded spacing — all use --space-* tokens
- [ ] Zero Bootstrap/Tailwind colour values — all use design system CSS variables
- [ ] Shared .btn-primary/.btn-secondary used everywhere (no local button redefinitions)
- [ ] formatDate consolidated to dates.ts (no local definitions)
- [ ] Sign-out appears once on desktop (sidebar only)
- [ ] Green badge uses --color-success and opacity pulse animation
- [ ] Profile badge clears appropriately
- [ ] Auth pages use same design tokens as rest of app
- [ ] Design system docs reflect actual implementation

## Sources

- Architecture strategist review (2026-03-29): token compliance, component hierarchy, badge patterns
- Pattern recognition review (2026-03-29): typography scale, spacing rhythm, 10 pattern categories
- Simplicity review (2026-03-29): CSS duplication quantification, extraction recommendations
- Explore audit (2026-03-29): 23-item inconsistency inventory
- User feedback: profile alignment, sign-out duplication, badge clearing, feedback form popover, admin archive
