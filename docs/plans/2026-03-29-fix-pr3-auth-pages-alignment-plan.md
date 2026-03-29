---
title: "fix: PR3 — Auth pages design system alignment"
type: fix
status: active
date: 2026-03-29
origin: docs/plans/2026-03-29-fix-design-system-enforcement-plan.md
---

# PR3: Auth Pages Design System Alignment

Login, join, and waitlist pages were built before the design system existed. They share ~300 lines of duplicated CSS and use Bootstrap colours, wrong border-radius, and different spacing/typography from the rest of the app. Depends on PR1 (tokens) being merged first.

## Items

- [ ] Extract shared auth layout: create `src/routes/(auth)/+layout.svelte` (or move shared CSS to shared.css) to eliminate ~300 lines of tripled CSS (split-layout, image-half, form-half, grain overlay, nav bar, mobile breakpoints)
- [ ] Replace border-radius: 4px with var(--radius-input) on all inputs and buttons
- [ ] Replace Bootstrap error colour #dc3545 with var(--color-danger)
- [ ] Replace Bootstrap success colour #198754 with var(--color-success)
- [ ] Replace focus border-color from var(--text-link-hover) to var(--text-muted) (matching design spec)
- [ ] Replace all hardcoded rem font sizes with nearest design token
- [ ] Replace disabled opacity 0.6 with var(--opacity-disabled) (0.5)
- [ ] Replace hover opacity 0.9 with var(--opacity-hover-btn) (0.85)

## Acceptance Criteria

- [ ] Login, join, waitlist use design system tokens (no hardcoded values)
- [ ] Auth CSS defined once (not tripled)
- [ ] Error/success colours match rest of app
- [ ] Focus states match rest of app
- [ ] Border radius matches rest of app
