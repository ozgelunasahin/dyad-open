---
status: pending
priority: p2
issue_id: "095"
tags: [security, code-review, database]
dependencies: []
---

# Drop get_registered_emails SECURITY DEFINER function

## Problem Statement

`get_registered_emails()` is a SECURITY DEFINER function that returns ALL user emails from `auth.users`. It was revoked from `anon` and `authenticated` in migration `20260326_fix_anon_function_access.sql`, but the function still exists and is callable by `service_role`. If any client-side code path ever uses the service role key, this is a full user enumeration vector.

## Fix

Drop the function entirely if unused, or restrict to `postgres` only.

```sql
DROP FUNCTION IF EXISTS get_registered_emails();
```

## Source

- Security sentinel review of PR #63
