---
title: "refactor: Slot card display + natural priority ordering"
type: refactor
status: active
date: 2026-03-27
---

# Slot Card Display + Natural Priority Ordering

Replace plain text slot/time displays with structured slot cards. Surface important items first through ordering and visual weight, not color or urgency signals.

## Problem Statement

Time slots, invitations, and meetings are displayed as plain text lists throughout the app. There's no visual hierarchy showing what's most important. A pending invitation looks the same as a published slot which looks the same as a past meeting.

## Design Decisions

### Slot cards, not calendar grids

With 1-3 slots maximum per conversation, a calendar grid or timeline is overkill. Research confirms: users find simple card lists easier to parse than position-mapped grids when there are fewer than 5 items. Each slot is a self-contained card.

### Day-cell picker stays where it is

The 7-day row picker is correct for **selection/filtering** (publish modal, discover filter). Do NOT reuse it as a read-only display — it creates false affordance (looks tappable when it's not). Slot cards handle display.

### Priority through ordering + opacity, not colour

The app's "healthy brain" philosophy rejects urgency signals. Instead:
- **State-based ordering**: needs-action items first, then upcoming, then past
- **Temporal sub-sorting**: soonest first within each group
- **Opacity for past**: `opacity: 0.5` or `--text-muted` on all text for past items
- **Presence/absence**: the "needs attention" section appears only when items exist — its appearance IS the signal

### Hybrid timestamps

| Distance | Format | Example |
|----------|--------|---------|
| Today | "Today, 3:00 PM" | Relative + absolute |
| Tomorrow | "Tomorrow, 10:00 AM" | Relative + absolute |
| 2-6 days | "Saturday, 3:00 PM" | Day name + time |
| 7+ days | "Mar 29, 3:00 PM" | Date + time |

Duration and area follow with interpunct separator: "Saturday, 3:00 PM · 1 hour · Kreuzberg"

## Changes

### 1. SlotCard Component

`src/lib/components/SlotCard.svelte` — new reusable component.

- [ ] Two-line layout:
  - Line 1 (date): serif, `--text-md`, weight 500 — "Saturday, March 29 at 3:00 PM"
  - Line 2 (details): monospace, `--text-xs`, `--text-muted` — "1 hour · Kreuzberg"
- [ ] Props: `startTime: string`, `durationMinutes: number`, `area: string`, `selected?: boolean`, `past?: boolean`, `onclick?: () => void`
- [ ] Selected state: inverted colours (dark bg, light text) matching publish modal pattern
- [ ] Past state: reduced opacity
- [ ] Tappable when `onclick` provided; static card otherwise
- [ ] Hybrid timestamp formatting built into the component

### 2. Prompt Detail — Inviter Slot Selection

`src/routes/(app)/prompts/[id]/+page.svelte` — replace text list with SlotCard:

- [ ] Available slots shown as SlotCard components (tappable, selected state)
- [ ] Sorted soonest first
- [ ] Replaces current `<div class="slot-item">` rows

### 3. Prompt Detail — Author Invitation Cards

Already partially done in PR #55. Enhance with SlotCard:

- [ ] Each invitation card uses SlotCard for the time display (read-only, not tappable)
- [ ] Cards sorted by soonest proposed slot first (not creation date)
- [ ] @username + response excerpt above the SlotCard

### 4. Profile — Conversation State Display

When the profile restructure happens (Phase 3 of the core flow plan), conversation cards show lifecycle state:

- [ ] Active slot → SlotCard showing next available slot
- [ ] Scheduled meeting → SlotCard showing meeting time + @participant
- [ ] Past meeting → SlotCard with reduced opacity
- [ ] Ordered: needs-action first, then upcoming, then past

### 5. Meeting Detail

`src/routes/(app)/meetings/[id]/+page.svelte`:

- [ ] Replace label-value grid with SlotCard for the time display
- [ ] Keep location, participant, and cancel button as separate elements below
- [ ] Past meetings: SlotCard with `past` prop

### 6. Timestamp Utility

`src/lib/utils/dates.ts` — add formatting function:

- [ ] `formatSlotTime(iso: string): string` — hybrid timestamp (Today/Tomorrow/Day name/Date)
- [ ] `formatSlotDetails(durationMinutes: number, area: string): string` — "1 hour · Kreuzberg"
- [ ] Used by SlotCard and anywhere else timestamps appear

### 7. Design System Update

`docs/design/design-system.md`:

- [ ] SlotCard component spec
- [ ] Hybrid timestamp format rules
- [ ] Priority ordering rules (state-based, then temporal)
- [ ] Past item opacity treatment
- [ ] When to use day-cell picker vs SlotCard (selection vs display)

## Files Changed

| File | Change |
|------|--------|
| `src/lib/components/SlotCard.svelte` | **New** — reusable time slot display |
| `src/lib/utils/dates.ts` | Add hybrid timestamp + details formatting |
| `src/routes/(app)/prompts/[id]/+page.svelte` | Use SlotCard for slot selection + invitation display |
| `src/routes/(app)/meetings/[id]/+page.svelte` | Use SlotCard for meeting time |
| `docs/design/design-system.md` | SlotCard spec, timestamp rules, ordering rules |

## What This Does NOT Change

- Publish modal (PublishSheet) — 7-day picker works, keep it
- Discover page FloatingNav date filter — works, keep it
- API endpoints — no backend changes

## Acceptance Criteria

- [ ] SlotCard component renders with hybrid timestamp
- [ ] Inviter sees slot cards (tappable) on prompt detail
- [ ] Author sees invitation cards with SlotCard time display
- [ ] Slots sorted soonest first everywhere
- [ ] Past items display at reduced opacity
- [ ] Design system doc updated
- [ ] Build passes, tests pass

## Sources

- Research: Calendly slot UI, NNG card patterns, UX Movement timestamp guidance, calm technology principles
- Design system: `docs/design/design-system.md`
- Design principles: `docs/design/design-principles.md` — healthy brain, no urgency signals
- Existing patterns: `PublishSheet.svelte` day-cell picker, `FloatingNav.svelte` date filter
