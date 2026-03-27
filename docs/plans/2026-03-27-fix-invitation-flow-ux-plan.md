---
title: "fix: Invitation flow UX — from form to conversation"
type: fix
status: active
date: 2026-03-27
origin: docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md
---

# Invitation Flow UX — From Form to Conversation

The invitation flow on the conversation detail page (`/conversations/[id]`) feels like filling out a form, not a guided social interaction. Raw `Select` buttons, a flat list of slots, and a textarea that appears after selection. This plan transforms it into a staged, card-based flow that feels like a natural next step after responding.

## Problem Statement

Current UX after responding to a conversation:

1. "Would you like to meet @sophie in person?" text appears
2. Flat list of slots with `Select` buttons per row
3. Selected slot gets a green tint background
4. Textarea appears for optional message
5. "Invite to meet" button at the bottom

Problems:
- Feels like a data entry form, not a social interaction
- Everything shown at once (slots + textarea + button) creates visual noise
- `Select` buttons are redundant — the card itself should be tappable
- Green tint on selection violates design principle ("no urgency signals / colour coding")
- Button/input styles defined locally, not using shared CSS classes
- Slot display is plain text (date, time, duration, area) — no visual hierarchy

## Proposed Solution

Replace the flat list with **staged inline disclosure** using **tappable SlotCards**. The flow reveals itself step by step as the user progresses, like a conversation not a form.

### Flow: Inviter (non-author) after responding

**Step 1: Invitation prompt** (appears after response is shown)
> Would you like to meet @sophie in person?
> [Pick a time]  ·  Not now

A single primary button and a muted dismissal link. The slot list is NOT visible yet.

**Step 2: Slot selection** (revealed when "Pick a time" is tapped)
1-3 SlotCard components, stacked vertically. Each card is a full-width tappable block:
- Line 1: Day + date in serif, weight 500 — "Saturday, 29 March at 15:00"
- Line 2: Duration + neighbourhood in monospace — "1 hour · Kreuzberg"
- Selected state: inverted colours (dark bg, light text), matching the publish modal
- Already-invited slots: muted with "Invited" badge, not tappable

Tapping a card toggles selection. No separate `Select` button.

**Step 3: Message** (revealed after slot selection)
A textarea slides in below the slot cards. Placeholder: "Add a message..." Optional — the user can skip it.

**Step 4: Confirmation + send**
Below the textarea, a summary line and primary send button:
> Meet @sophie · Saturday 29 March, 15:00 · Kreuzberg
> [Send invitation]

**Step 5: Sent state**
The entire invite flow collapses into a single card:
> Invitation sent to @sophie · Saturday 29 March, 15:00 · Kreuzberg
> Waiting for a response.

### Flow: Author receiving invitations

Already uses card layout (`.response-card.has-invitation`). Enhance with:
- SlotCard for time display (read-only) instead of monospace text
- Sorted by soonest proposed slot first

## Implementation

### Phase 1: SlotCard Component + Date Utility

Build the reusable pieces first. These come from the existing slot card plan (`docs/plans/2026-03-27-refactor-slot-card-display-and-priority-plan.md`).

#### `src/lib/utils/dates.ts`

- [x] `formatHybridDate(iso: string): string` — Today/Tomorrow/Day name/Full date based on distance
- [x] `formatSlotTime(iso: string): string` — "15:00" (24h, locale-appropriate)
- [x] `formatSlotDetails(durationMinutes: number, area: string): string` — "1 hour · Kreuzberg"

#### `src/lib/components/SlotCard.svelte`

- [x] Props: `startTime: string`, `durationMinutes: number`, `area: string`, `selected?: boolean`, `invited?: boolean`, `past?: boolean`, `onclick?: () => void`
- [x] Two-line layout:
  - Line 1: `formatHybridDate(startTime)` + `formatSlotTime(startTime)` — serif, `--text-md`, weight 500
  - Line 2: `formatSlotDetails(durationMinutes, area)` — monospace, `--text-xs`, `--text-muted`
- [x] Selected state: `background: var(--text-primary); color: var(--bg-canvas);` — inverted, no green tint
- [x] Invited state: muted opacity + "Invited" badge, not tappable
- [x] Past state: `opacity: 0.5`
- [x] Tappable when `onclick` provided (cursor: pointer, hover: opacity 0.85)
- [x] Card styling: `padding: var(--space-4); border: 1px solid var(--border-link); border-radius: var(--radius-card);`

### Phase 2: Conversation Detail — Inviter Flow

Rewrite the invitation section in `src/routes/(app)/conversations/[id]/+page.svelte`:

- [ ] Add `inviteStep` state: `'prompt' | 'picking' | 'confirming' | 'sent'`
- [ ] **Step: prompt** — show "Would you like to meet @author?" + "Pick a time" button (btn-primary) + "Not now" link (btn-text, sets step back to hidden)
- [ ] **Step: picking** — show SlotCard list (sorted soonest first). Tapping a card sets `selectedSlotId` and advances to confirming.
- [ ] **Step: confirming** — show selected SlotCard (read-only, selected state), textarea (placeholder: "Add a message..."), summary line, and "Send invitation" button (btn-primary)
- [ ] **Step: sent** — collapse to a single card showing "Invitation sent to @author" + slot details + "Waiting for a response"
- [ ] Remove local button/input CSS — use shared `.btn-primary`, `.btn-secondary`, `.btn-text` from `shared.css`
- [ ] Remove green tint selection (`.slot-item.selected` with `rgba(61,158,90,...)`)
- [ ] Remove the `.select-slot` button per slot
- [ ] Keep the read-only slots section (before responding) but use SlotCard components there too

### Phase 3: Conversation Detail — Author View

Enhance the existing `.response-card.has-invitation` section:

- [ ] Use SlotCard (read-only) instead of `.inv-slot` monospace text
- [ ] Sort invitation cards by soonest proposed slot first
- [ ] Keep Accept button as btn-primary
- [ ] Keep meeting link display for accepted invitations

### Phase 4: Cleanup

- [ ] Remove unused local CSS classes: `.slot-item`, `.slot-info`, `.slot-date`, `.slot-time`, `.slot-duration`, `.slot-area`, `.select-slot`, `.invited-badge`, `.invite-flow`, `.invite-prompt`, `.invitation-sent-card`, `.invite-btn`, `.submit-btn`
- [ ] Update design-system.md with SlotCard spec
- [ ] Check off items in the slot card plan

## Technical Considerations

- **No backend changes.** The API calls (`POST /api/prompts/[id]/invitations`, `POST /api/prompts/[id]/comments`) remain the same.
- **Svelte 5 reactivity:** The `inviteStep` state drives conditional rendering via `{#if}` blocks. No derived state complexity — just a simple state machine.
- **Mobile-first:** SlotCards are full-width, stacked vertically. The textarea appears inline. The send button is directly below. No horizontal layout concerns.
- **Accessibility:** SlotCards with `onclick` get `role="button"` and `tabindex="0"` with keyboard handler. Selected state communicated via `aria-pressed`.

## Acceptance Criteria

- [ ] SlotCard component renders with hybrid timestamps
- [ ] Invitation flow uses staged disclosure (prompt → pick → confirm → sent)
- [ ] Tapping a slot card selects it (no separate Select button)
- [ ] Selected state uses inverted colours (not green tint)
- [ ] Optional message textarea appears only after slot selection
- [ ] Sent state shows a compact confirmation card
- [ ] Author view uses SlotCard for time display
- [ ] Shared CSS classes used (no local button/input duplicates)
- [ ] Mobile-first: full-width cards, stacked vertically
- [ ] Build passes, E2E tests pass

## Files Changed

| File | Change |
|------|--------|
| `src/lib/utils/dates.ts` | **New** — hybrid timestamp + slot details formatting |
| `src/lib/components/SlotCard.svelte` | **New** — reusable time slot card |
| `src/routes/(app)/conversations/[id]/+page.svelte` | Rewrite invitation flow with staged disclosure + SlotCards |
| `docs/design/design-system.md` | Add SlotCard spec |

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md](docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md) — issue #19 (invitation card view)
- **Slot card plan:** [docs/plans/2026-03-27-refactor-slot-card-display-and-priority-plan.md](docs/plans/2026-03-27-refactor-slot-card-display-and-priority-plan.md) — SlotCard component spec
- **Design system:** [docs/design/design-system.md](docs/design/design-system.md) — card patterns, button hierarchy
- **Design principles:** [docs/design/design-principles.md](docs/design/design-principles.md) — no urgency signals, guidance through placeholders, response-first
- **User story:** [docs/stories/002-discover-engage-schedule-meeting.md](docs/stories/002-discover-engage-schedule-meeting.md) — invitation flow requirements
- **Todo:** #089 — Invitation flow design alignment
- **External research:** Cal.com staged disclosure, NNG progressive disclosure, UX Movement card selection, Airbnb date selection patterns
