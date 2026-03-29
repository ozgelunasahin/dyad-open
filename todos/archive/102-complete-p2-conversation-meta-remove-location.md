---
status: pending
priority: p2
issue_id: "102"
tags: [code-review, ux, v0.1]
---

# Conversation detail meta line shows location — should show published date

## Problem Statement

The conversation detail meta line currently shows `@lisa · Thu, Mar 26 · Neukölln` but having location next to the author doesn't make sense here. It should be `@lisa published on <date>` for author view, and `@marco wrote...` style for responses.

## Findings

- User feedback: "conversation prompt has the location next to it even though it makes no sense to have a location here"
- Location belongs with time slots, not the conversation header
- The general_area was derived from first slot — this is a detail page concern, not header metadata

## Technical Details

- File: `src/routes/(app)/conversations/[id]/+page.svelte` line 128
- Current: `{#if data.prompt.available_slots[0]?.general_area} · {data.prompt.available_slots[0].general_area}{/if}`
- Should be: `published on {formatDate(data.prompt.published_at)}`

## Acceptance Criteria

- [ ] Meta line shows `@username · published on <date>` (no location)
- [ ] Location remains visible in slot cards where it belongs
