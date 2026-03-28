---
title: "Svelte 5 step machine: $derived base + $state override"
category: ux-patterns
tags: [svelte5, runes, state-machine, derived-state, step-machine]
components: [src/routes/(app)/feedback]
date: 2026-03-28
---

# Svelte 5 Step Machine: $derived Base + $state Override

## Problem

A multi-step UI (e.g., feedback form with met/rating/waiting/reveal steps) needs to be driven by two different sources at different times: server state determines the initial and post-submission step, but user interaction drives intermediate transitions. A pure `$derived` from server state ignores user clicks. A pure `$state` ignores server-driven transitions after submission.

## Root Cause

Svelte 5 runes enforce a clear distinction between derived (computed) and owned (mutable) state. There is no built-in "derived with override" primitive. Using only `$derived` means user actions cannot set the step. Using only `$state` means the component must imperatively sync with every server state change, which is error-prone and creates coupling.

## Solution

Use a nullable `$state` override layered on top of a `$derived` base. The override is set by user actions and cleared (`null`) when control should return to the server-derived value.

```typescript
type FeedbackStep = 'met' | 'rating' | 'waiting' | 'reveal';

function deriveStep(formState: FeedbackFormState): FeedbackStep {
  if (formState === 'locked' || formState === 'released') return 'reveal';
  if (formState === 'submitted') return 'waiting';
  return 'met'; // 'due' — 'not_due' handled by server redirect
}

// In the component
let userStep = $state<FeedbackStep | null>(null);
let effectiveStep = $derived(userStep ?? deriveStep(data.form.state));

// User clicks "yes, we met" → advance to rating
function onMetConfirmed() {
  userStep = 'rating';
}

// After PATCH submission succeeds, clear override so server state drives again
async function onSubmit(payload: FeedbackInput) {
  const res = await submitFeedback(payload);
  // Update data with response...
  userStep = null; // Hand control back to server-derived step
}
```

The key insight: `null` means "no user override, defer to server." Any non-null value means "user is driving." After any server mutation, reset to `null`.

## When This Applies

Any Svelte 5 component where a UI state (step, tab, mode, panel) has a "default" derived from server/prop data but can be temporarily overridden by user interaction, then needs to snap back to server-driven values after a mutation. Examples:

- Multi-step forms with server-driven initial state
- Progressive disclosure driven by both server data and user choices
- Optimistic UI where the server response should "correct" the client state

## When NOT to Use This

If all transitions are user-driven (no server state component), use a plain `$state`. See `docs/solutions/ux-patterns/staged-disclosure-vs-inline-selection.md` for a case where a 5-value step machine was correctly replaced by a single `$state` variable.

## Anti-Patterns

- **Never use `$effect` to sync `$state` from server data.** It creates reactive loops and timing bugs. The `$derived` base handles server reactivity without effects.
- **Never forget to reset the override after submission.** If `userStep` stays non-null after a PATCH, the component ignores the server response.

## Related

- `docs/solutions/integration-issues/svelte5-tiptap-reactive-loop.md` — the "local `$state` absorbs changes while `$derived` feeds initial state" fix is an instance of this pattern
- `docs/solutions/ux-patterns/response-first-invitation-flow.md` — the `hasResponse = $derived(...)` gate is a server-driven base without user override (simpler variant)
- `docs/solutions/ux-patterns/staged-disclosure-vs-inline-selection.md` — cautionary counterexample: when NOT to use a step machine
