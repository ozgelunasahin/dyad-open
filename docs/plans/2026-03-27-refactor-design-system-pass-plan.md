---
title: "refactor: Design system pass — tokens, shared styles, consistency"
type: refactor
status: active
date: 2026-03-27
---

# Design System Pass — Tokens, Shared Styles, Consistency

Eliminate ad-hoc CSS across the app by introducing design tokens, a shared styles file, and consistent component patterns. Based on a full audit of the current codebase.

## Problem Statement

The app has grown through rapid iteration without a design system. The result:

- **36 distinct font-size values** — near-duplicates like `0.85rem`, `0.82rem`, `0.8rem`, `0.78rem` (4 values within 1.6px)
- **17 distinct border-radius values** — `app.css` defines `--radius-card` and `--radius-input` but they're used only 3 times; hardcoded `6px` (24 uses), `4px` (21 uses), `8px` (19 uses) dominate
- **`font-family: 'SangBleu Sunrise'` repeated 99 times** — because form elements don't inherit from body
- **38+ distinct padding values** for button-like elements (`8px 20px`, `10px 24px`, `10px 20px`, `8px 14px`, `6px 14px`)
- **4 different back-navigation implementations** — `.back-link`, `.back-btn`, `.back-text-btn` with identical styling but different class names; some use `history.back()`, some use hardcoded hrefs
- **No shared component styles** — every page re-declares button, input, link, and section-title styles

## Proposed Solution

### Phase 1: Tokens in `app.css`

Add spacing and typography tokens to the existing CSS custom properties:

```css
:root {
  /* Spacing — 4px base */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* Type scale */
  --text-xs: 0.6875rem;   /* 11px — metadata, badges */
  --text-sm: 0.8125rem;   /* 13px — secondary text, hints */
  --text-base: 0.875rem;  /* 14px — body, inputs, buttons */
  --text-md: 0.9375rem;   /* 15px — comfortable reading */
  --text-lg: 1rem;        /* 16px — section titles */
  --text-xl: 1.125rem;    /* 18px — sub-headings */
  --text-2xl: 1.5rem;     /* 24px — page titles */
  --text-3xl: 1.8rem;     /* ~29px — hero/detail title */

  /* Font stacks */
  --font-serif: 'SangBleu Sunrise', Georgia, 'Times New Roman', serif;
  --font-mono: 'SF Mono', 'Fira Code', Menlo, monospace;

  /* Line heights */
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;
}
```

Add global form element reset (eliminates 99 redundant font-family declarations):
```css
button, input, textarea, select {
  font-family: var(--font-serif);
  font-size: var(--text-base);
  color: var(--text-primary);
}
```

### Phase 2: Shared styles in `src/lib/styles/shared.css`

Create shared CSS classes for repeating patterns:

- **`.back-link`** — unified back navigation style (covers all 4 current implementations)
- **`.btn-primary`** — dark background, light text (publish, send, create)
- **`.btn-secondary`** — outlined, light background (cancel, edit, unpublish)
- **`.section-title`** — serif, 1rem, normal weight
- **`.meta-label`** — monospace, uppercase, small, muted
- **`.field-error`** — red, small
- **`.badge`** — monospace, tiny, pill-shaped status indicator

Import once from `app.css` or root layout.

### Phase 3: Page-by-page migration

Migrate each page to use tokens and shared classes, one commit per page:

- [ ] `src/app.css` — add tokens + form reset
- [ ] `src/lib/styles/shared.css` — create with shared patterns
- [ ] `src/routes/(app)/discover/+page.svelte`
- [ ] `src/routes/(app)/prompts/[id]/+page.svelte`
- [ ] `src/routes/(app)/profile/+page.svelte`
- [ ] `src/routes/(app)/meetings/[id]/+page.svelte`
- [ ] `src/routes/(app)/prompts/new/+page.svelte`
- [ ] `src/routes/(editor)/prompts/[id]/edit/+page.svelte`
- [ ] `src/lib/components/FloatingNav.svelte`
- [ ] `src/lib/components/PromptEditor.svelte`
- [ ] `src/lib/components/BottomSheet.svelte`
- [ ] `src/lib/components/PublishSheet.svelte`
- [ ] `src/lib/components/LocationSearch.svelte`

### Phase 4: Unify back navigation

All back navigation uses the same `.back-link` class with explicit destinations:

| Page | Back destination | Label |
|------|-----------------|-------|
| `/prompts/[id]` | `/discover` | ← Back |
| `/meetings/[id]` | `/profile` | ← Back |
| `/prompts/[id]/edit` | `/prompts/[id]` | ← Back |
| Profile sub-views | Profile overview | ← Back (onclick) |
| Legal pages | `/` | ← dyad.berlin |

No `history.back()` — explicit destinations are PWA-safe.

## Technical Considerations

- **Svelte scoped styles**: Scoped `<style>` blocks still override global classes via specificity (Svelte adds component hash). Component-specific layout stays in scoped styles; shared visual patterns use global classes.
- **No breaking changes**: Tokens are additive. Migration replaces hardcoded values with token references — no visual change if done correctly.
- **Verify with design reference**: Before each page migration, check `docs/design/ref-*.jpg` screenshots AND `git show origin/feat/v0.1-design-work:<path>` code for the intended design.

## Acceptance Criteria

- [ ] `app.css` has spacing, typography, and font-stack tokens
- [ ] Form elements inherit font from body (no per-component font-family)
- [ ] `shared.css` exists with button, back-link, section-title, meta-label, field-error, badge classes
- [ ] All pages use tokens instead of hardcoded pixel/rem values for font-size, spacing, border-radius
- [ ] Back navigation is consistent: same class, explicit destinations, no history.back()
- [ ] No visual regressions — design matches reference screenshots
- [ ] `svelte-check` passes, build passes, 74 tests pass

## Sources

- Codebase audit: 36 font sizes, 17 radii, 99 font-family repetitions, 38+ padding values, 4 back-nav patterns
- Design reference: `docs/design/ref-*.jpg`, `origin/feat/v0.1-design-work`, `origin/feat/v0.1-design-profile`
- Research: CSS custom property design tokens, 4px spacing grid, modular type scale, PWA navigation patterns
