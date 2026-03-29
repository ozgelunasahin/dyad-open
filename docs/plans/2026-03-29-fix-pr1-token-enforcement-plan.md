---
title: "fix: PR1 — Token enforcement + shared CSS extraction"
type: fix
status: active
date: 2026-03-29
origin: docs/plans/2026-03-29-fix-design-system-enforcement-plan.md
reviewed: 2026-03-29
---

# PR1: Token Enforcement + Shared CSS Extraction

Replace all hardcoded CSS values with design tokens. Extract duplicated patterns to shared locations. Includes auth pages (token replacement only — layout extraction is PR3).

## Design Decisions (resolved 2026-03-29)

1. **Border-radius: no new tokens.** Use existing three (6px, 12px, 999px). Round all hardcoded values to nearest: 3px/4px/8px → `--radius-input` (6px). 10px/16px/20px → `--radius-card` (12px). Fewer values = more coherence. The differences between 8/10/12/16/20 read as accidents, not decisions.

2. **Colour shift on auth pages: accept it.** Replace Bootstrap `#dc3545` with `--color-danger` (#c00) and `#198754` with `--color-success` (#3d9e5a). The warm paper palette needs deeper, less saturated colours. The auth pages should look like they belong to the same app.

3. **Font sizes: round to nearest token.** SangBleu Sunrise is sensitive to size relationships — arbitrary rems break typographic rhythm. `1.05rem` → `--text-lg`. `0.78rem` → `--text-sm`. `0.58rem` → `--text-xs`. `0.65rem` → `--text-xs`. Visual shifts are tiny; rhythm improvement is significant.

4. **No `--space-7` (28px).** Round to `--space-6` (24px) or `--space-8` (32px). The 4px grid matters.

5. **Strip all CSS variable fallbacks.** `var(--border-link, rgba(0,0,0,0.12))` → `var(--border-link)`. Tokens are always defined. Fallbacks add noise.

6. **Add `--bg-glass` token.** `rgba(245, 244, 240, 0.96)` is part of dyad's visual identity (FloatingNav, date panel, profile cards). Tokenize it.

## 1. Define missing tokens in app.css

- [ ] `--opacity-hover-card: 0.72` — list items, cards, links
- [ ] `--opacity-hover-btn: 0.85` — buttons, primary actions
- [ ] `--opacity-disabled: 0.5` — all disabled states
- [ ] `--content-narrow: 560px` — meetings, feedback
- [ ] `--content-standard: 700px` — conversation detail, profile, editor
- [ ] `--content-wide: 800px` — discover
- [ ] `--bg-glass: rgba(245, 244, 240, 0.96)` — glassmorphic surfaces (FloatingNav, date panel)

## 2. Replace hardcoded values across ALL pages and components

For each file: replace bare px/rem font sizes with `--text-*`, bare spacing with `--space-*`, hardcoded colours with CSS variables, hardcoded border-radius with nearest of the three existing tokens, hardcoded opacity with new opacity tokens, strip all fallback values from `var()` calls.

**App pages:**
- [ ] `src/routes/(app)/discover/+page.svelte`
- [ ] `src/routes/(app)/feedback/[id]/+page.svelte`
- [ ] `src/routes/(app)/meetings/[id]/+page.svelte`
- [ ] `src/routes/(app)/profile/+page.svelte`
- [ ] `src/routes/(app)/conversations/[id]/+page.svelte`
- [ ] `src/routes/(editor)/conversations/[id]/edit/+page.svelte`

**Auth pages (token replacement only — layout extraction is PR3):**
- [ ] `src/routes/login/+page.svelte`
- [ ] `src/routes/join/+page.svelte`
- [ ] `src/routes/waitlist/+page.svelte`

**Components:**
- [ ] `src/lib/components/BottomSheet.svelte`
- [ ] `src/lib/components/FloatingNav.svelte` — replace hardcoded #1a1a1a/#f5f4f0 with tokens, use --bg-glass
- [ ] `src/lib/components/PublishSheet.svelte`
- [ ] `src/lib/components/Sidebar.svelte`
- [ ] `src/lib/components/MapView.svelte` — marker colours → tokens
- [ ] `src/lib/components/LocationSearch.svelte`
- [ ] `src/lib/components/SearchOverlay.svelte`
- [ ] `src/lib/components/PromptEditor.svelte`
- [ ] `src/lib/components/ConfirmDialog.svelte`
- [ ] `src/lib/components/FeedbackModal.svelte`

**Other:**
- [ ] `src/lib/styles/shared.css` — .badge hardcoded values
- [ ] `src/routes/+page.svelte` (landing)
- [ ] `src/routes/+error.svelte`
- [ ] `src/routes/impressum/+page.svelte` / `datenschutz/+page.svelte`

## 3. Extract duplicated CSS to shared.css

- [ ] Prompt-row pattern (.prompt-row, .row-thumb, .thumb-img, .thumb-placeholder, .row-body, .row-title, .row-status)
- [ ] Reveal card CSS (.reveal-card, .reveal-noshow, .reveal-quote, .reveal-tags, .reveal-tag)
- [ ] Replace 8 local button classes with shared .btn-primary / .btn-secondary
- [ ] Remove unused CSS (.prompt-actions in discover)

## 4. Update design system docs

- [ ] Document new tokens (opacity, content-width, --bg-glass)
- [ ] Document dual breakpoint system: 430px (phone layout) + 768px (sidebar visible)
- [ ] Document border-radius rationale: three values only, round to nearest

## 5. Post-implementation: visual check

After all changes, open every page at desktop and mobile and verify it feels like one product. This is a human judgment, not a grep.

## Acceptance Criteria

- [ ] No bare px/rem font-size values — all use `--text-*` tokens
- [ ] No bare px/rem margin/padding/gap values (above 2px) — all use `--space-*` tokens
- [ ] No hardcoded hex/rgba colour values — all use CSS variables
- [ ] No hardcoded border-radius — all use one of three tokens
- [ ] No CSS variable fallback values (stripped from all `var()` calls)
- [ ] All shared patterns extracted (prompt-row, reveal card, buttons)
- [ ] New tokens documented in design-system.md
- [ ] No new svelte-check errors
