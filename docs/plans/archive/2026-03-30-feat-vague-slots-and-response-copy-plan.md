---
title: "feat: Vague slot preview before response + softer invitation copy"
type: feat
status: active
date: 2026-03-30
---

# Vague Slot Preview + Softer Invitation Copy

Two related improvements to the response-first invitation flow: slots should be visually vague before the user responds (teasing without revealing), and the copy guiding users toward that response needs to be warmer, more human, and aligned with dyad's voice.

## Background

The response-first flow already gates slot interaction behind writing a response (`hasResponse` derived state). But the slots currently render with full date, time, and location regardless — they're just non-interactive. This makes the gating feel transactional ("I can see what I want but it's locked"). The fix is to lean into the vagueness: show that times exist, but not which times specifically.

The existing copy — `'Respond to unlock invitation...'` — compounds this by using "unlock," a word that implies a reward/paywall dynamic. dyad is about cultivating genuine connection, not gamification. The language should explain *why* responding matters, not that something is withheld.

## Acceptance Criteria

### Vague slots
- [ ] Before response: each `SlotCard` shows only the day of the week (e.g., `Wednesday`) — no time range, no neighbourhood
- [ ] Before response: vague slots are visually subdued — muted text color (`--text-muted`), no interactive affordance, non-clickable
- [ ] Before response: a soft nudge label appears above the vague slots (see copy below)
- [ ] After response: slots render normally with full date, time, and area — no visible change to the post-response experience
- [ ] `SlotCard` vague mode is opt-in via a `vague` prop (default `false`) — no regressions on other uses (profile, meeting detail)

### Copy
- [ ] `responsePlaceholderWithSlots` drops "unlock" entirely — new string below
- [ ] New `slotsTeaser` string added for the nudge label above vague slots
- [ ] All other "unlock" references audited and removed
- [ ] Copy stays short — placeholder fits one line in the textarea

## Proposed Copy

```typescript
responsePlaceholder: 'Share your thoughts...',
responsePlaceholderWithSlots: 'Share your thoughts...',
slotsTeaser: (authorUsername: string) =>
  `Share your thoughts on this with @${authorUsername} to see the times they've suggested to meet`,
```

`slotsTeaser` becomes a function (like `inviteQuestion`) since it includes the author's username. The placeholder collapses to a single string — the teaser label above the vague slots carries the contextual meaning, so the textarea doesn't need to repeat it.

## Implementation

### `SlotCard.svelte`

Add `vague?: boolean` to the Props interface (default `false`).

When `vague`:
- Replace the slot date/time span with just the day name: `new Date(startTime).toLocaleDateString('en-GB', { weekday: 'long' })`
- Omit `slot-details` (area) entirely
- Add `.slot-card.vague` CSS class: `color: var(--text-muted)`, `pointer-events: none`, `user-select: none`
- Do not render as a `<button>` — render as the non-interactive `<div>` branch regardless of `onclick`

### `conversations/[id]/+page.svelte`

In the "normal invite flow" block (currently lines 216–243), before the `{#each data.prompt.available_slots as slot}` loop:

```svelte
{#if !hasResponse}
  <p class="slots-teaser">{copy.conversation.slotsTeaser}</p>
{/if}

{#each data.prompt.available_slots as slot}
  <SlotCard
    ...
    vague={!hasResponse}
    onclick={hasResponse ? () => { ... } : undefined}
  />
{/each}
```

Remove the existing empty `{#if hasResponse}` guard around `inviteQuestion` — it already only shows post-response, no change needed there.

### `copy.ts`

```typescript
responsePlaceholder: 'Share your thoughts...',
responsePlaceholderWithSlots: 'Share your thoughts...',
slotsTeaser: (authorUsername: string) =>
  `Share your thoughts on this with @${authorUsername} to see the times they've suggested to meet`,
```

Since both placeholder strings are now identical, the conditional in `+page.svelte` line 160 (`slots.length > 0 ? responsePlaceholderWithSlots : responsePlaceholder`) can be simplified to just `copy.conversation.responsePlaceholder`. The teaser label does the contextual work instead.

No other copy strings contain "unlock" (confirmed by search).

## Files

- `src/lib/components/SlotCard.svelte` — add `vague` prop + CSS class
- `src/routes/(app)/conversations/[id]/+page.svelte` — pass `vague={!hasResponse}`, add teaser label
- `src/lib/copy.ts` — update `responsePlaceholderWithSlots`, add `slotsTeaser`

## Sources

- Solution doc: `docs/solutions/ux-patterns/response-first-invitation-flow.md`
- Conversation view: `src/routes/(app)/conversations/[id]/+page.svelte:190–246`
- SlotCard: `src/lib/components/SlotCard.svelte`
- Design principles: `docs/design/design-principles.md`
