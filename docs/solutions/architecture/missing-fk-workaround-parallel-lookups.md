---
topic: Working around missing foreign keys in Supabase with parallel lookups
date: 2026-03-27
prs: [55, 57]
tags: [supabase, database, foreign-key, performance]
---

# Missing FK Workaround: Parallel Lookups

## Context

PR #55 needed to show the author which users had sent invitations to their conversation. The `prompt_invitations` table has an `inviter_id` column, but there is no foreign key from `inviter_id` to the `profiles` table. Supabase's PostgREST query builder uses FK relationships to enable `.select('inviter:inviter_id(username)')` join syntax. Without the FK, this join silently returns null.

The same pattern appeared in PR #57 when computing the "attention count" (pending invitations + due feedback) in the app layout loader.

## What We Learned

1. **Supabase `.select()` joins require actual FK constraints.** This is not obvious from the API docs. If you write `.select('profile:user_id(username)')` and there's no FK from `user_id` to `profiles.id`, PostgREST returns the row but with `profile: null`. There is no error, no warning. The data just looks empty.

2. **The workaround is a two-step query: fetch IDs, then batch-lookup profiles.** PR #55 does this:
   ```typescript
   // Step 1: Get invitations with comment and slot joins (these FKs exist)
   const { data: enriched } = await supabase
       .from('prompt_invitations')
       .select('id, inviter_id, message, created_at, comment:comment_id(body), slot:slot_id(start_time, ...)')
       .eq('prompt_id', id)
       .eq('state', 'pending');

   // Step 2: Separate lookup for inviter usernames (no FK)
   const inviterIds = [...new Set(enriched.map(inv => inv.inviter_id))];
   const { data: profiles } = await supabase
       .from('profiles')
       .select('id, username')
       .in('id', inviterIds);

   // Step 3: Merge
   const inviterMap = new Map(profiles.map(p => [p.id, p.username]));
   ```

3. **Use `Promise.all` when you have independent queries.** PR #57 parallelises profile lookup, invitation count, and feedback count in the layout loader:
   ```typescript
   const [{ data: profile }, { count: invitationCount }, { count: feedbackCount }] =
       await Promise.all([
           supabase.from('profiles').select('username').eq('id', userId).single(),
           supabase.from('prompt_invitations').select('*', { count: 'exact', head: true })
               .eq('invitee_id', userId).eq('state', 'pending'),
           supabase.from('feedback_forms').select('*', { count: 'exact', head: true })
               .eq('user_id', userId).eq('state', 'due')
       ]);
   ```
   This runs three queries concurrently instead of sequentially. For a layout loader that runs on every navigation, the latency savings are significant.

4. **`head: true` with `count: 'exact'` is the Supabase equivalent of `SELECT COUNT(*)`.** It returns only the count header, no rows. This is the right pattern for badge counts where you don't need the actual data.

5. **Consider adding the FK.** The real fix is `ALTER TABLE prompt_invitations ADD CONSTRAINT ... FOREIGN KEY (inviter_id) REFERENCES auth.users(id)`. The workaround exists because `auth.users` is managed by Supabase Auth and adding FKs to it requires a migration that references the `auth` schema. It's possible but requires `SUPABASE_SERVICE_ROLE_KEY` in the migration. Worth doing if this pattern recurs.

## The Fix / Pattern

When Supabase join syntax returns null for a column you expect to have data:

1. Check whether an FK constraint actually exists (look in `supabase/migrations/`)
2. If no FK: use the two-step ID-collect-then-batch-lookup pattern
3. If multiple independent queries are needed: wrap them in `Promise.all`
4. For count-only queries: use `{ count: 'exact', head: true }`
5. Track missing FKs as tech debt -- the join syntax is cleaner and PostgREST can optimise it

## Why This Matters

Silent null returns from missing FK joins are a subtle bug category. The UI renders "anonymous" or an empty field, and it looks like a data problem rather than a query problem. Knowing that Supabase joins are FK-dependent saves significant debugging time.
