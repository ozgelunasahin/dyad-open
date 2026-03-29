---
topic: Admin identity via app_metadata, not a database column
date: 2026-03-28
prs: [64]
tags: [security, supabase, rls, admin, auth]
---

# Admin Identity: app_metadata, Not a DB Column

## Context

Building an admin panel for the alpha playtest. Needed a way to identify admin users for RLS policies, API guards, and route guards.

## What We Learned

The legacy `can_publish_sites` column on `profiles` was the admin flag. But the existing RLS policy "Users can update their own profile" allows any authenticated user to UPDATE their own profile row — including setting `can_publish_sites = true`. **Any user could grant themselves admin.**

Supabase doesn't support column-level RLS on UPDATE — you can't say "users can update their own row but not the `can_publish_sites` column."

## The Fix

Use Supabase `app_metadata` (`auth.users.raw_app_meta_data`) for admin identity. This field is **immutable from the client** — only service-role or the Supabase dashboard can modify it.

```sql
-- In RLS policies (with SELECT wrapper for performance):
USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')

-- In SvelteKit server code:
locals.user?.app_metadata?.role === 'admin'
```

The `(SELECT ...)` wrapper is a Supabase-documented performance optimization — without it, `auth.jwt()` can be re-evaluated per row.

**Operational note:** After setting `app_metadata` via the dashboard, the admin must log out and back in. The JWT is only refreshed on new session creation.

**Bonus:** The old `requireAdmin()` in the invites API made a DB query to `profiles` on every call. The new version reads from the already-decoded JWT — zero additional queries.

## Why This Matters

Anytime you're putting authorization flags in a user-editable table, check whether the UPDATE RLS policy allows users to set those flags themselves. If so, move the flag to `app_metadata` or a separate admin-only table with restrictive RLS.
