---
topic: Staged disclosure state machines can overengineer simple interactions
date: 2026-03-27
prs: [56, 60, 61]
tags: [ux, state-machine, invitation, progressive-disclosure]
---

# Staged Disclosure vs Inline Selection

## Context

The invitation flow on the conversation detail page went through three designs across PRs #56, #60, and #61:

**V1 (PR #56):** Flat list of slots with `Select` buttons, separate "Pick a time" section heading. Everything visible at once after responding. Simple but visually noisy.

**V2 (PR #60):** Full staged disclosure state machine with five states: `hidden -> prompt -> picking -> confirming -> sent`. Each stage revealed the next piece of UI. Inspired by progressive disclosure patterns from NNG research and Cal.com's booking flow.

**V3 (PR #61):** Reverted to inline selection. Slots always visible (read-only before responding, tappable after). Tap a card to select it, button + inline message input appear. No multi-step state machine.

## What We Learned

1. **The state machine added cognitive overhead for the developer, not clarity for the user.** The `inviteStep` state had five values and an `$effect()` to auto-advance from `hidden` to `prompt` when conditions were met. This created implicit state transitions that were hard to reason about -- the UI would change without the user doing anything.

2. **Hiding available slots until after responding removed useful context.** In V2, you couldn't see *when* the conversation was happening until you clicked "Pick a time." But knowing the times is part of deciding whether to respond at all. V3 shows slots as read-only before responding -- they become tappable after.

3. **The "confirming" step was redundant.** V2 showed the selected slot in "selected state," then a textarea, then a "Send invitation" button. V3 puts the button inline with the message input directly below the selected card. Same information, one fewer step.

4. **Progressive disclosure works for complex forms, not simple choices.** A user picking 1 of 2-3 time slots is not a complex form. It's a single selection. The staged approach made it feel like a wizard for what should feel like tapping a card.

## The Fix / Pattern

Use inline selection with conditional rendering instead of a state machine when:
- The number of choices is small (< 5 items)
- Selection and action happen on the same screen
- The user needs context from all options to make a choice

Reserve staged disclosure for:
- Multi-step forms where each step has validation
- Flows where showing everything at once would be overwhelming (10+ options)
- Wizards where steps have real dependencies (step 2's options depend on step 1)

The final pattern in V3:

```
[Response text + Edit button]

[Slots section -- always visible]
  SlotCard (read-only if no response yet, tappable after responding)
  SlotCard (selected state: 2px border highlight)

  [Send invitation] [Add a message (optional)]  <-- inline row, appears on selection
```

One reactive variable (`selectedSlotId`) instead of a five-value state machine.

## Why This Matters

It's tempting to apply UX research patterns (progressive disclosure, staged wizards) to every interaction. But the research assumes complexity that may not exist. When the whole interaction is "pick a card, press send," adding stages slows the user down and makes the code harder to maintain. The simpler V3 also has fewer CSS classes (removed 15+ local classes from V2) and no `$effect()` for implicit state transitions.
