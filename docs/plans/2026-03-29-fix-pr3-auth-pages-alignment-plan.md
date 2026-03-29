---
title: "fix: PR3 — Auth pages design system alignment"
type: fix
status: active
date: 2026-03-29
origin: docs/plans/2026-03-29-fix-design-system-enforcement-plan.md
reviewed: 2026-03-29
---

# PR3: Auth Pages Design System Alignment

Login, join, and waitlist pages were built before the design system existed. They share ~300 lines of duplicated CSS and use Bootstrap colours, wrong border-radius, and different spacing/typography from the rest of the app. Beyond token enforcement, the auth pages need two design-level fixes: the headline typography doesn't match the app's editorial voice, and the nav/logo is misplaced. Depends on PR1 (tokens) being merged first.

## Review Findings (2026-03-29)

**Changes from initial plan:**
1. Resolved layout extraction approach: route group layout, not shared CSS file (eliminates triplicated HTML too).
2. Added missing items: textarea styling, auth-card max-width unification, waitlist mobile breakpoint divergence, image border-radius, error display unification.
3. Added typography upgrade: auth h1 → `--text-3xl` weight 300 to match editorial voice.
4. Added nav/logo fix: move from centered-over-form to top-left of page (overlaying image).
5. Focus border-color confirmed correct: `--text-muted` matches the rest of the app.
6. Font size mapping made explicit.

## 1. Create (auth) route group layout

- [ ] Create `src/routes/(auth)/+layout.svelte` with shared structure: split-layout, image-half with grain overlay, form-half wrapper, mobile breakpoint
- [ ] Move login, join, waitlist into `src/routes/(auth)/` (update any internal links if needed)
- [ ] Each page keeps only its unique form markup and page-specific styles (auth-card content)
- [ ] Fix nav/logo placement: move from `position: fixed; right: 0; width: 50%` (centered over form half) to top-left of the page, overlaying the image half. The landing page puts the logo top-left of the left column — the auth layout should rhyme with this, not center the logo over a form.

## 2. Typography upgrade

- [ ] Auth h1 ("Welcome back", "You're invited", "Request to join"): change from `1.75rem` / weight 400 to `var(--text-3xl)` (~29px) / weight 300 (light). These are arrival-moment phrases and should feel crafted, connecting to the editorial tone set by the landing page's large serif headlines.
- [ ] Subtitle: keep at `var(--text-sm)`, weight 400 — these are functional, not display.

## 3. Replace hardcoded values with design tokens

- [ ] Replace `border-radius: 4px` with `var(--radius-input)` on all inputs, textareas, buttons, error/success messages
- [ ] Replace image `border-radius: 8px` with `var(--radius-card)` (12px) — the images are large surfaces like cards, not inputs
- [ ] Replace Bootstrap error colour `#dc3545` / `rgba(220, 53, 69, *)` with `var(--color-danger)`
- [ ] Replace Bootstrap success colour `#198754` / `rgba(25, 135, 84, *)` with `var(--color-success)`
- [ ] Replace `opacity: 0.6` (disabled) with `var(--opacity-disabled)` on inputs, textareas, buttons
- [ ] Replace `opacity: 0.9` (hover) with `var(--opacity-hover-btn)` on submit buttons
- [ ] Replace hardcoded font sizes with tokens:
  - `0.95rem` (subtitle, label, switch-auth) → `var(--text-sm)` (13px)
  - `0.9rem` (error/success message, textarea) → `var(--text-sm)` (13px)
  - `0.85rem` (hint) → `var(--text-xs)` (11px)
  - `1rem` (input, button) → `var(--text-base)` (14px)
- [ ] Replace focus `border-color: var(--text-link-hover)` with `var(--text-muted)` — matches the rest of the app (conversation detail, feedback form all use `--text-muted` for focus)

## 4. Unify inconsistencies across auth pages

- [ ] Unify `auth-card` max-width: login=360px, join=400px, waitlist=360px — use 400px for all (accommodates join's extra fields, gives breathing room)
- [ ] Unify error display: waitlist uses `.error-text` (inline red text below button), login/join use `.error-message` (box with background). Use the box pattern for all — it's more visible and matches how errors appear in the rest of the app.
- [ ] Unify mobile breakpoint: waitlist uses `padding: 0` + `border-radius: 0` on image, while login/join use `padding: 16px` + `border-radius: 8px` (→ `--radius-card`). Use the padded approach for all — edge-to-edge images with no radius feel like a different app.
- [ ] Textarea in waitlist: same token replacements as inputs (border-radius, opacity, font-size)

## Acceptance Criteria

- [ ] Login, join, waitlist use design system tokens (no hardcoded colour values, no bare px border-radius, no bare rem font sizes)
- [ ] Auth CSS defined once in layout (not tripled across pages)
- [ ] Auth h1 uses `--text-3xl` weight 300 — editorial, not functional
- [ ] Logo sits top-left overlaying image, not centered over form
- [ ] Error/success colours use `--color-danger` / `--color-success`
- [ ] Focus states use `--text-muted` (matching rest of app)
- [ ] Image border-radius uses `--radius-card`
- [ ] Consistent error display, max-width, and mobile breakpoint across all three pages
- [ ] No new svelte-check errors
