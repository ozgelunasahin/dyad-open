---
id: 105
status: pending
priority: p2
title: Meeting location should be a tappable maps link
---

# Meeting location should be a tappable maps link

The exact location on the meeting detail page and the confirmed meeting card on the conversation detail page should be a clickable link that opens in a maps app (Google Maps, Apple Maps).

Use a Google Maps link: `https://www.google.com/maps/search/?api=1&query={lat},{lng}` or a `geo:` URI.

## Files

- `src/routes/(app)/meetings/[id]/+page.svelte` — meeting detail location row
- `src/lib/components/SlotCard.svelte` — `exactLocation` section
