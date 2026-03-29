---
title: "Migration rewrites silently change behavior — always diff against original"
problem_type: process
modules: [database, migrations]
severity: high
date_discovered: 2026-03-28
status: resolved
tags: [process, migrations, postgres, claude-workflow]
---

# Migration rewrites silently change behavior

## Problem

When adding a notification INSERT to the `cancel_meeting` RPC, the migration used `CREATE OR REPLACE FUNCTION` which rewrites the entire function body. The new version introduced 3 undocumented behavioral changes:

1. **Column name mismatch**: `free_pass` instead of `free_pass_used` — would cause a runtime error on every cancellation
2. **Logic change**: Added a 90-day rolling window to the free pass check (was lifetime) — changes cancellation policy
3. **Missing logic**: Dropped the `UPDATE time_slots SET accepted = FALSE` block for early cancellations — slots would remain locked forever

None of these were intentional. They happened because the function was rewritten from scratch rather than surgically modified.

## Root Cause

Postgres doesn't support `ALTER FUNCTION ... ADD LINE`. The only way to modify a function is `CREATE OR REPLACE`, which replaces the entire body. When Claude rewrites a function to add one feature, it reconstructs the logic from memory/context rather than copying the original verbatim and adding the new lines. Small details (column names, conditional branches) get lost.

## Solution

When modifying a Postgres function via migration:

1. **Read the original function first** — grep for it in previous migrations
2. **Copy the original body verbatim** into the new migration
3. **Make only the targeted addition** — add the new lines, don't restructure
4. **Diff the old and new versions** before committing — any line that changed beyond the stated purpose is a bug until proven otherwise
5. **Document all behavioral changes** in the migration header comments

## Prevention

- **Before writing a `CREATE OR REPLACE FUNCTION` migration**: always read the current function definition from the existing migrations
- **After writing**: explicitly diff the old and new function bodies
- **Review agents should flag**: any `CREATE OR REPLACE FUNCTION` migration where the diff contains changes beyond the stated purpose

## Related

- `supabase/migrations/20260410_cancel_meeting_notification.sql` — the fixed migration
- `supabase/migrations/20260330_create_meetings.sql` — the original `cancel_meeting` function
