---
id: 108
status: pending
priority: p1
title: Profile FloatingNav needs full action buttons
---

# Profile FloatingNav needs full action buttons

The FloatingNav on the profile page currently only shows discover + profile icons. It needs:

1. **+ button** — create a new conversation (`/conversations/new`)
2. **Search** — search/filter within your conversations on the profile page
3. **Calendar** — filter to show pending/scheduled meetings

These match the discover page's FloatingNav actions but scoped to the profile context.

## Files

- `src/lib/components/FloatingNav.svelte` — add profile variant with full actions
- `src/routes/(app)/profile/+page.svelte` — pass variant/props to FloatingNav
