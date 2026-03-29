---
status: pending
priority: p1
issue_id: "103"
tags: [code-review, migration, security, v0.1-blocker]
---

# Migration 20260410 silently changes cancel_meeting behavior beyond stated purpose

## Problem Statement

The cancel_meeting notification migration (`20260410_cancel_meeting_notification.sql`) rewrites the entire function but introduces 3 undocumented behavioral changes beyond adding the notification:

1. **Column rename**: `free_pass_used` → `free_pass` in the INSERT into `cancellation_records`. If the actual column is still `free_pass_used`, this will cause a runtime error.
2. **90-day window added**: Late cancellation count query now has `AND cr.created_at > NOW() - INTERVAL '90 days'` — changes free-pass logic.
3. **Early cancellation slot release removed**: The original had `UPDATE time_slots SET accepted = FALSE WHERE id = v_meeting.slot_id` for early cancellations. This was dropped, meaning early cancellations no longer free the slot.

## Acceptance Criteria

- [ ] Verify `cancellation_records` column name matches migration (free_pass vs free_pass_used)
- [ ] Document the 90-day window as intentional or revert
- [ ] Restore slot release for early cancellations or document why it was removed
