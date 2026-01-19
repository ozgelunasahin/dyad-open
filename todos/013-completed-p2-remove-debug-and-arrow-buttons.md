---
id: "013"
status: completed
priority: p2
title: "Remove debug button in prod and non-functional arrow buttons"
created: "2026-01-19"
---

# Remove Debug and Arrow Buttons

## Problem
- Debug button should not be visible in production
- Arrow buttons in bottom left of UI are non-functional and should be removed

## Solution
1. Conditionally hide debug button based on environment (dev only)
2. Remove the non-functional arrow navigation buttons from the UI

## Files to modify
- `src/lib/components/Canvas.svelte` - Debug button, arrow buttons
- `src/routes/canvas/[canvasId]/+page.svelte` - UI controls area
