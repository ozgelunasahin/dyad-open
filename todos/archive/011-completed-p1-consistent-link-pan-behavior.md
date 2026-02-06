---
id: "011"
status: completed
priority: p1
title: "Make link following pan behavior consistent with focus + click"
created: "2026-01-19"
---

# Consistent Link Following Pan Behavior

## Problem
The pan behavior when following a wikilink is not consistent with the focus + click behavior. Users expect the same camera movement whether they click a link or use keyboard navigation.

## Solution
Ensure that following a link uses the same pan/focus logic as clicking on a card that's already open. The `focusCard()` method's conservative panning rules should apply uniformly.

## Files to investigate
- `src/lib/stores/canvas.svelte.ts` - `followLinkToRight()`, `focusCard()`, pan behavior logic
- `src/lib/components/Card.svelte` - Link click handling
