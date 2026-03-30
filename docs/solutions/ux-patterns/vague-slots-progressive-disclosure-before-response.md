---
topic: Progressive slot disclosure — vague time slots before response, full reveal after
date: 2026-03-30
prs: [79]
tags: [ux, progressive-disclosure, response-first, slots, copy, invitation-flow]
---

# Vague Slots: Progressive Disclosure Before Response

## Context

PR #79 implemented progressive slot disclosure on the conversation detail page. Before this, available time slots were rendered with full date, time, and location even when the user hadn't written a response — they just weren't interactive (no `onclick`). This created a transactional "I can see what I want but it's locked" feeling, reinforced by the placeholder text "Respond to unlock invitation..."

## What We Learned

### The "unlock" metaphor was the wrong frame

The original placeholder `"Respond to unlock invitation..."` frames the response as a gate to get through — a paywall dynamic. But the response IS the meeting context (see `response-first-invitation-flow.md`). The language should explain the relationship, not the transaction.

The replacement copy — `"respond to @{author} to see the times they've suggested to meet"` — reframes it completely:
- It names the author (personal, not mechanical)
- It explains what happens next (see times)
- It positions the author as offering, not the system as gatekeeping

This copy lives in `copy.conversation.slotsTeaser(authorUsername)` and is used as the textarea placeholder when slots exist.

### Vague means "day + neighbourhood, no time"

The `vague` prop on `SlotCard` shows:
- **Day name** ("Wednesday", "Tomorrow") via `formatSlotDayOnly()` which delegates to `formatHybridDate` for locale consistency
- **Neighbourhood** ("KREUZBERG") — gives interesting context without specificity
- **No time range** — this is the key omission; the time is what makes a slot actionable

The vague display uses `opacity: 0.45`, `color: var(--text-muted)`, `pointer-events: none`. It renders as a `<div>`, not a `<button>`, so there's no keyboard accessibility concern.

### E2E tests break when copy changes are selectors

The core-flow E2E test used `getByPlaceholder('Respond to unlock invitation')` to find the response textarea. When the copy changed, the test silently failed (timeout). The fix was to use `.response-input` (the CSS class) as the selector instead of the placeholder text.

**Rule**: E2E selectors should use stable structural selectors (CSS classes, roles, data attributes), not copy strings that change with wording decisions.

## The Fix / Pattern

1. `SlotCard` gains a `vague?: boolean` prop (default `false`). When true, renders day + area only.
2. `conversations/[id]/+page.svelte` passes `vague={!hasResponse}` to each slot in the "normal invite flow" block.
3. `copy.conversation.slotsTeaser(authorUsername)` replaces `responsePlaceholderWithSlots` — a function rather than a string, since it includes the author's name.
4. The "See all" button guard on profile uses `filteredConversations.length`, not `conversations.length` (caught in review).

## Why This Matters

Progressive disclosure is standard UX, but the non-obvious part is that the *copy* does more work than the *UI*. The visual vagueness (day + area at 0.45 opacity) creates intrigue. The placeholder text explains the relationship. Together they guide the user toward genuine engagement without feeling locked out. The "unlock" framing made users feel the system was withholding; the "respond to see" framing makes them feel invited.
