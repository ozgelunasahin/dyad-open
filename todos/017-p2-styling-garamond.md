---
id: "017"
status: pending
priority: p2
title: "Update styling - Garamond font and trydyad.app inspiration"
created: "2026-01-19"
---

# Styling Update

## Goals
1. Use Garamond as the default font
2. Take styling cues from https://www.trydyad.app/

## Tasks
- [ ] Add Garamond font (Google Fonts or self-hosted)
- [ ] Update CSS variables in `app.css` or global styles
- [ ] Review trydyad.app for color palette, spacing, typography
- [ ] Apply consistent styling across login, dashboard, canvas UI

## Files to modify
- `src/app.html` - Add font import
- `src/app.css` or `src/lib/styles/` - Update CSS variables and typography
- Component styles as needed

## Notes
- Garamond options: EB Garamond (Google Fonts), Cormorant Garamond, or system serif fallback
- Consider font loading performance (font-display: swap)
