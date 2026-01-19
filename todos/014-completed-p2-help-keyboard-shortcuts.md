---
id: "014"
status: completed
priority: p2
title: "Add help button and ? shortcut for keyboard commands"
created: "2026-01-19"
---

# Help Button and Keyboard Shortcuts Display

## Problem
Users have no way to discover available keyboard shortcuts and commands.

## Solution
- Add a help button to the UI
- Pressing `?` should show available keyboard commands
- Display along the bottom of the screen (not a modal overlay)
- Could be a slide-up panel or inline help bar

## Design considerations
- Should not obstruct the canvas when visible
- Easy to dismiss
- List all available keyboard shortcuts (arrow keys, Tab for links, Escape, etc.)

## Files to modify
- `src/lib/components/Canvas.svelte` - Add keyboard listener for `?`
- `src/routes/canvas/[canvasId]/+page.svelte` - Add help UI component
- May need new `src/lib/components/HelpBar.svelte` component
