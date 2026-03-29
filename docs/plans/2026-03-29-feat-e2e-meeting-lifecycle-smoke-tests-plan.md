---
title: "feat: E2E smoke tests for meeting lifecycle states"
type: feat
status: active
date: 2026-03-29
---

# E2E Smoke Tests for Meeting Lifecycle States

## Overview

Add Playwright smoke tests that verify every meeting lifecycle state renders correctly. The seed data (`supabase/seed.sql`) already provides meetings in all states with stable IDs. Tests navigate directly to seeded pages and assert the correct UI elements.

## Problem Statement

The app has no E2E coverage for meeting detail pages, cancelled meetings, feedback status, or revealed feedback. The only E2E flow test (`core-flow.test.ts`) covers respond-invite-accept but doesn't verify the meeting detail page states afterward.

## Proposed Solution

A single test file `tests/e2e/meeting-states.test.ts` with one `test.describe` block. Each test logs in as an appropriate user, navigates to a seeded meeting page, and asserts key UI elements. No test data creation or cleanup needed — tests are read-only against seed data.

### Prerequisites

Add lisa, nina, and kai to the auth infrastructure:

#### `tests/helpers/auth.ts`

Add to `TEST_USERS`:

```typescript
lisa: {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'lisa@test.invalid',
  password: 'password123',
  storagePath: 'tests/.auth/lisa.json'
},
nina: {
  id: '77777777-7777-7777-7777-777777777777',
  email: 'nina@test.invalid',
  password: 'password123',
  storagePath: 'tests/.auth/nina.json'
},
kai: {
  id: '88888888-8888-8888-8888-888888888888',
  email: 'kai@test.invalid',
  password: 'password123',
  storagePath: 'tests/.auth/kai.json'
}
```

#### `tests/auth.setup.ts`

Add authentication steps for lisa, nina, kai (same pattern as sophie/tom).

#### `.gitignore`

Verify `tests/.auth/` is already gitignored (it is — `tests/.auth/*.json`).

### Test Matrix

| # | State | Meeting ID | Log in as | Navigate to | Key assertions |
|---|-------|-----------|-----------|-------------|----------------|
| 1 | **Scheduled** | `c0000002-...` | nina | `/meetings/c0000002-...` | "Meeting with @kai", date, area "Kreuzberg", exact location "Gorlitzer Park", cancel button visible |
| 2 | **Cancelled early** | `c0000003-...` | nina | `/meetings/c0000003-...` | "Meeting with @kai", area "Kreuzberg", NO cancel button, NO feedback section |
| 3 | **Cancelled late** | `c0000004-...` | lisa | `/meetings/c0000004-...` | "Meeting with @marco", area "Neukolln", NO cancel button |
| 4 | **Awaiting feedback (due)** | `c0000005-...` | kai | `/meetings/c0000005-...` | "Meeting with @marco", "Feedback submitted" (kai already submitted) |
| 5 | **Completed** | `c0000006-...` | nina | `/meetings/c0000006-...` | "Meeting with @marco", "What they shared with you", rating tags visible |
| 6 | **Pending invitation** | — | lisa | `/conversations/seed-prompt-marco` | "You have invited @marco, waiting for them to confirm." |
| 7 | **Confirmed meeting on conversation** | — | kai | `/conversations/seed-prompt-scheduled` | "Confirmed", "You are meeting @nina" |

### User availability

| User | Gated? | Can test |
|------|--------|----------|
| lisa | No | Cancelled late, pending invitation |
| nina | No | Scheduled, cancelled early, completed |
| kai | No (submitted) | Awaiting feedback (one-side), confirmed on conversation |
| marco | **Yes** (due form) | Gate redirect (bonus test) |
| sophie/tom | No | Reserved for core-flow.test.ts |

### Test file structure

```
tests/e2e/meeting-states.test.ts
```

```typescript
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../helpers/auth.js';

test.describe('Meeting lifecycle states', () => {

  test('scheduled meeting shows details and cancel button', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: TEST_USERS.nina.storagePath });
    const page = await ctx.newPage();
    await page.goto('/meetings/c0000002-0000-0000-0000-000000000001');
    await expect(page.getByText('Meeting with @kai')).toBeVisible();
    await expect(page.getByText('Kreuzberg')).toBeVisible();
    await expect(page.getByText('Cancel meeting')).toBeVisible();
    await ctx.close();
  });

  test('cancelled early meeting shows no cancel button', async ({ browser }) => {
    // nina views cancelled_early meeting
    // Assert: header visible, no cancel button, no feedback section
  });

  test('cancelled late meeting shows no cancel button', async ({ browser }) => {
    // lisa views cancelled_late meeting
  });

  test('awaiting feedback shows submitted status', async ({ browser }) => {
    // kai views meeting where he already submitted feedback
    // Assert: "Feedback submitted — waiting for the other person"
  });

  test('completed meeting shows revealed feedback', async ({ browser }) => {
    // nina views completed meeting
    // Assert: "What they shared with you", rating tags
  });

  test('pending invitation shows on conversation page', async ({ browser }) => {
    // lisa views marco's conversation where she sent invitation
    // Assert: "You have invited @marco, waiting for them to confirm."
  });

  test('confirmed meeting shows on conversation page', async ({ browser }) => {
    // kai views nina's conversation where meeting is scheduled
    // Assert: "Confirmed", "You are meeting @nina"
  });
});
```

## Acceptance Criteria

- [ ] lisa, nina, kai added to `TEST_USERS` in `tests/helpers/auth.ts`
- [ ] lisa, nina, kai authenticated in `tests/auth.setup.ts`
- [ ] `tests/e2e/meeting-states.test.ts` — 7 smoke tests covering all states
- [ ] All 7 tests pass on clean `supabase db reset`
- [ ] Existing 15 tests still pass (no regressions)
- [ ] Tests are read-only (no data mutation, no cleanup needed)

## Context

### Seed data IDs (stable, from `supabase/seed.sql`)

```
Meetings:
  c0000001-0000-0000-0000-000000000001  awaiting_feedback (ava+ben, both due — gated users)
  c0000002-0000-0000-0000-000000000001  scheduled (nina+kai, tomorrow)
  c0000003-0000-0000-0000-000000000001  cancelled_early (nina+kai)
  c0000004-0000-0000-0000-000000000001  cancelled_late (lisa+marco)
  c0000005-0000-0000-0000-000000000001  awaiting_feedback (kai+marco, kai submitted)
  c0000006-0000-0000-0000-000000000001  completed (marco+nina, both locked)

Conversations:
  seed-prompt-marco      has pending invitation from lisa
  seed-prompt-scheduled  has confirmed meeting (nina+kai)
```

### Meeting page rendering by state

| State | Shows location? | Cancel button? | Feedback section? | Revealed feedback? |
|-------|----------------|----------------|-------------------|-------------------|
| scheduled | Yes (exact) | Yes | No | No |
| cancelled_early | No (uses getDetail) | No | No | No |
| cancelled_late | No (uses getDetail) | No | No | No |
| awaiting_feedback | Yes (exact) | No | Yes (due/submitted) | No |
| completed | Yes (exact) | No | No | Yes |

### Notes

- `getWithLocation` (SECURITY DEFINER) returns exact_location for active meetings
- `getDetail` (SECURITY DEFINER) returns only general_area — used as fallback for cancelled meetings
- Cancelled meetings still show in the RPC because the participant check passes; the RPC excludes cancelled states only from `getWithLocation`, so `getDetail` is the fallback
- Marco is feedback-gated — could add a bonus test verifying gate redirect, but that's covered by the existing ava/ben gate test pattern
