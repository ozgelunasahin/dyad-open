---
id: "010"
status: completed
priority: p1
title: "Use fixed card width (column width) for all cards"
created: "2025-01-19"
completed: "2026-01-19"
---

# Fixed Card Width

## Problem
Cards currently have variable widths calculated from content using `calculateOptimalWidthFromJson()`. New notes with short titles appear very narrow (MIN_CARD_WIDTH = 220px), which looks inconsistent.

## Solution
All cards should use the same fixed column width (MAX_CARD_WIDTH = 440px or similar) for visual consistency, matching the previous newspaper-style layout.

## Files to modify
- `src/lib/types/index.ts` - Could simplify to single CARD_WIDTH constant
- `src/lib/stores/canvas.svelte.ts` - Remove dynamic width calculation, use fixed width
- `src/lib/utils/json-content.ts` - `calculateOptimalWidthFromJson()` may no longer be needed

## Notes
- Height should still be calculated from content
- This simplifies the layout logic significantly
