---
id: 109
status: pending
priority: p2
title: Hoist myMeeting step 1 into Promise.all for parallel execution
tags: [code-review, performance]
---

# Hoist myMeeting step 1 into Promise.all

The myMeeting lookup in `+page.server.ts` runs two sequential queries after the main `Promise.all` completes. Step 1 (find meeting ID by prompt + participant) can be hoisted into the existing parallel batch, saving one network round trip (~10-25ms) for every non-author page load.

## Files

- `src/routes/(app)/conversations/[id]/+page.server.ts` — lines 123-148
