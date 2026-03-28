---
topic: Extending SECURITY DEFINER functions across feature PRs
date: 2026-03-27
prs: [34, 35, 36]
tags: [postgresql, security-definer, atomicity, supabase, state-machine]
---

# RPC Cascading Side Effects Across Feature PRs

## Context

The backend was built in feature slices: comments/invitations (PR #34), meetings (PR #35), feedback (PR #36). Each feature added new side effects to existing database functions. The `accept_invitation` function was created in PR #34, extended in PR #35. The `advance_scheduled_meetings` function was created in PR #35, extended in PR #36.

## What We Learned

### 1. Functions grow across PRs in non-obvious ways

`accept_invitation` started as:
- Lock invitation, lock slot, mark slot as accepted, cancel competing invitations, return boolean

By PR #35, it became:
- All of the above, plus: guard against slots starting within 12h, create a meeting record, return the meeting UUID instead of boolean

This required `DROP FUNCTION` (return type changed from `BOOLEAN` to `UUID`), which silently drops execution grants. If you forget `REVOKE/GRANT EXECUTE` after the drop, the function becomes callable by `public` -- a privilege escalation.

### 2. The advance function grew to create forms

`advance_scheduled_meetings` started as a simple state transition: `scheduled` -> `awaiting_feedback`. In PR #36, it grew to also create two feedback forms per meeting (one per participant) in the same transaction. Without this, there's a window where a meeting is in `awaiting_feedback` state but no forms exist -- and the feedback gate would never trigger.

### 3. Simultaneous reveal requires careful locking

The feedback `submit_feedback` function demonstrates the trickiest variant: after updating the caller's form, it must check whether the other party's form is also submitted, and if so, lock BOTH forms atomically. This is a cross-row coordination within the same table:

```sql
-- Lock the other party's form
SELECT * INTO v_other_form FROM feedback_forms
WHERE meeting_id = v_form.meeting_id AND reviewer_id = v_form.reviewee_id
FOR UPDATE;

IF v_other_form.state = 'submitted' THEN
  -- Both submitted! Lock both forms simultaneously
  UPDATE feedback_forms SET state = 'locked', locked_at = NOW()
  WHERE meeting_id = v_form.meeting_id AND state = 'submitted';
  -- Also transition meeting to completed
  UPDATE meetings SET state = 'completed', resolved_at = NOW()
  WHERE id = v_form.meeting_id AND state = 'awaiting_feedback';
END IF;
```

The `FOR UPDATE` on the other form is essential -- without it, two simultaneous submissions could both see `state = 'due'` and both write `state = 'submitted'` without triggering the lock.

## The Fix / Pattern

**Rule: If two operations must never have a visible intermediate state between them, they belong in the same SECURITY DEFINER function.** Do not split atomic operations across multiple RPCs, even if the second one "should always succeed."

Checklist when extending an existing function in a new migration:

1. If the return type changes, use `DROP FUNCTION IF EXISTS` then `CREATE FUNCTION`
2. After DROP + CREATE, re-apply `REVOKE EXECUTE ON FUNCTION ... FROM public` and `GRANT EXECUTE ON FUNCTION ... TO authenticated` (or `service_role`)
3. Always add `SET search_path = public` to SECURITY DEFINER functions
4. Test the extended function with the original test cases (regression) plus the new behavior
5. Check for race conditions: if two users could call the function simultaneously, add `FOR UPDATE` locks on shared rows

## Why This Matters

A future developer adding a new feature (e.g., notifications on meeting creation) might be tempted to create a separate `create_notification_after_meeting()` trigger or a second RPC call. This creates a failure window: the meeting exists but the notification doesn't. If the notification is critical (like feedback form creation is), it must go inside the existing atomic function.

The general signal: whenever you find yourself writing "call X, then call Y" in a service method and both must succeed, those two operations probably belong in a single database function.
