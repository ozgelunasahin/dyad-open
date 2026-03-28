---
title: SvelteKit hydration skew race on multi-user state transitions
category: integration-issues
tags: [sveltekit, hydration, race-condition, real-time, multi-user]
components: [src/routes/(app)/feedback]
date: 2026-03-28
---

# SvelteKit Hydration Skew Race

## Problem

A SvelteKit page loads with stale server data when another user's action changes shared state between the server load function executing and the client completing hydration. The client initializes reactive state from the now-stale server snapshot, showing an incorrect UI until the next explicit data fetch.

## Root Cause

SvelteKit's SSR-to-hydration pipeline has an inherent time window — typically hundreds of milliseconds to several seconds depending on network conditions, bundle size, and device speed. During this window, the serialized `data` prop is frozen. There is no built-in mechanism to detect that server-side data has become stale before hydration completes.

**Concrete example:** User A's feedback page loads with `form.state = 'submitted'` (waiting for User B). While the HTML is in transit, User B submits their feedback, locking both forms. User A's client hydrates with stale `submitted` state but the actual state is `locked`. User A sees "waiting for the other person" when the reveal is already ready.

## Solution

Issue a lightweight validation fetch on mount to reconcile the hydrated state with current server state:

```typescript
import { onMount } from 'svelte';

onMount(async () => {
  if (effectiveStep !== 'waiting') return; // Only reconcile hot states

  const res = await fetch(`/api/feedback/${data.form.id}`);
  const current = await res.json();

  if (current.state !== data.form.state) {
    // State diverged during hydration window — update
    data.form = { ...data.form, state: current.state };
    userStep = null; // Let $derived re-derive the step
  }
});
```

The validation endpoint should be cheap — return only the state field, not the full resource.

## When This Applies

Any SvelteKit page where the rendered state depends on data that other users or background processes can mutate concurrently. Specifically:

- Multi-party workflows (feedback, collaborative editing, approvals)
- Dashboards showing live counts or statuses
- Any page where "stale for 2 seconds" produces a visibly wrong UI

Does NOT apply to single-user data that only changes via the current user's own actions.

## Identifying Hot States

Not every state needs reconciliation. Only "hot" states — those that can change due to another actor's concurrent action — are hydration-skew candidates. In the feedback case:

- `due` → only changes when `advance_scheduled_meetings()` runs (cron, infrequent) — low risk
- `submitted` → changes when the OTHER user submits — **hot state**, reconcile on mount
- `locked` → terminal state — no reconciliation needed

## Prevention

- When designing multi-user flows, identify states that can change due to another user's action. These are the hydration-skew candidates.
- Code review checklist: "Does this page render a state that another actor can change? If yes, does `onMount` reconcile?"
- For real-time applications, Supabase Realtime subscriptions (`postgres_changes`) are the proper long-term fix, but the `onMount` reconciliation is the minimal correct solution for alpha.

## Related

- `docs/solutions/architecture/feedback-gate-middleware-pattern.md` — the gate runs at request time and could interact with hydration skew (e.g., feedback form becomes `due` between load and hydration)
- `docs/solutions/ux-patterns/map-state-preservation-with-sveltekit-snapshots.md` — snapshots handle state across navigations but do not solve hydration skew
