---
title: PATCH response enrichment for server-side state transitions
category: architecture
tags: [api-design, state-machine, network-efficiency, sveltekit]
components: [src/routes/api]
date: 2026-03-28
---

# PATCH Response Enrichment Pattern

## Problem

When a PATCH endpoint triggers a state transition that unlocks new data (e.g., both parties submitted feedback, transitioning to `locked`), the client needs that newly-available data immediately. A naive design returns only `{ state: 'locked' }` and forces the client to make a second GET request, adding latency, a flash of stale UI, and extra client-side fetch logic.

## Root Cause

REST convention treats PATCH as "update and confirm," returning only the modified resource or a status. But in state-machine flows, a transition can unlock data that didn't exist or wasn't accessible before the PATCH. The server already has all the information at response time — the second round-trip is pure waste.

## Solution

Detect the post-transition state inside the PATCH handler and conditionally enrich the response:

```typescript
// In +server.ts PATCH handler
const newState = await feedbackService.submit(formId, payload);

if (newState === 'locked') {
  // Both parties submitted — reveal data is now available
  const revealed = await feedbackService.getRevealedFeedback(meetingId, userId);
  return json({ ok: true, state: 'locked', revealed });
}

return json({ ok: true, state: 'submitted' });
```

The client handles both response shapes without a follow-up request:

```typescript
const data = await res.json();
if (data.state === 'locked' && data.revealed) {
  showReveal(data.revealed);
} else {
  showWaitingState();
}
```

## When This Applies

Any mutation endpoint where the server-side effect produces data the client needs to render the next UI state. Common in:

- Two-party workflows (feedback, approvals, handshakes)
- State machines where one party's action unlocks shared data
- Any flow where "PATCH then GET" would create a visible flash of incomplete UI

Does NOT apply when the resulting data is large or expensive to compute — in those cases, return a status and let the client fetch lazily.

## Prevention

- During API design, ask: "Does this mutation trigger a state transition that unlocks new data the client will immediately need?"
- Code review checklist: "If the endpoint returns a new state, does the client have everything it needs to render that state without a follow-up request?"

## Related

- `docs/solutions/architecture/rpc-cascading-side-effects.md` — RPC functions that RETURN resulting data (e.g., `accept_invitation` returns meeting UUID) are the database-side enabler for this pattern
- `docs/solutions/architecture/feedback-gate-middleware-pattern.md` — the dual response format (303 redirect for pages, 403 JSON for API) is a related pattern of shaping responses by context
