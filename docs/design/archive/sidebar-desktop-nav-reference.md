---
title: Desktop sidebar navigation — archived reference
archived: 2026-03-29
reason: Removed in favour of FloatingNav-only navigation (mobile-first PWA approach)
revisit: v0.2 — consider whether desktop benefits from a different nav pattern (top bar, horizontal nav, or sidebar revival)
---

# Desktop Sidebar Navigation — Archived Reference

This sidebar was the desktop navigation from v0.1 alpha. It was removed to create a consistent mobile-first navigation experience using FloatingNav on all viewports. This reference is preserved for v0.2 when desktop navigation may be revisited.

## Visual Design

- 180px wide, sticky, full viewport height
- Border-right: 1px solid `--border-link`
- Padding: `--space-6` vertical, `--space-5` horizontal
- Background: inherits `--bg-canvas`

## Structure

```
[Logo (22px, muted)]

[Discover]          ← active state: --text-primary, font-weight 500
[Profile · badge]   ← badge: mono, --text-xs, inverted colours
[Admin]             ← conditional on isAdmin

        ↓ margin-top: auto (pushes to bottom)

[@username]         ← mono, --text-sm, muted
[sign out]          ← --text-sm, muted, underline on hover
```

## Typography

- Nav links: `--text-base` (14px), `--text-muted` default, `--text-primary` on hover/active
- Active weight: 500
- Username: `--font-mono`, `--text-sm`
- Badge: `--font-mono`, `--text-xs`, inverted (primary bg, canvas text)

## Interaction

- Links: color transition 0.15s, background transition 0.15s
- Hover: `--text-primary` + `--bg-control` background
- Active: `--text-primary`, `font-weight: 500`, no background change
- Sign-out hover: color transition 0.2s

## Responsive

- Visible at > 768px
- Hidden at ≤ 768px (FloatingNav takes over)
- When visible, the FloatingNav default variant was hidden to avoid duplication
- All fixed elements (FloatingNav, BottomSheet, map pane) offset by `calc(50% + 90px)` or `left: 180px`

## Full Component Source

```svelte
<!-- See git history: src/lib/components/Sidebar.svelte before removal -->
<!-- Last version: branch fix/design-system-token-enforcement -->
```
