---
title: "refactor: Integrate FloatingNav from Ozge's design PRs"
type: refactor
status: completed
date: 2026-03-26
---

# Integrate FloatingNav from Ozge's Design PRs

PR #46. Adopted the FloatingNav mobile pill navigation from `feat/v0.1-design-work`.

## What Was Delivered

- [x] Adapted `FloatingNav.svelte` for prompt domain (removed SearchOverlay, fixed URLs)
- [x] Integrated on discover page (desktop + mobile, top position)
- [x] Map/list toggle, date filter with day picker, + (create), profile icon
- [x] Reference screenshots added to `docs/design/`

## Remaining Design Work (Separate PRs)

The following items from the original design integration scope were NOT included in this PR and need their own plans:

- **Editor redesign** — clean writing view, cover photo placeholder, FloatingNav editor variant, Continue dropdown, publish modal → see `docs/plans/2026-03-26-refactor-editor-redesign-plan.md`
- **Discover card polish** — frosted-glass date filter, hover effects, thumbnail refinement
- **Profile page action cards** — Airbnb-style grid layout, state badges
- **Shared CSS extraction** — split-layout.css, form.css for login/join/waitlist deduplication
- **General visual polish** — border radius tokens, hover standardisation, transition consistency

## Sources

- **Design branches:** `feat/v0.1-design-work` (PR #27), `feat/v0.1-design-profile` (PR #28)
- **Reference screenshots:** `docs/design/photo_2026-03-26_16-*.jpg`
