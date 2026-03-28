---
topic: RLS two-party visibility — different row access rules per party
date: 2026-03-27
prs: [34, 36]
tags: [rls, supabase, postgresql, privacy, two-party]
---

# RLS Two-Party Visibility Pattern

## Context

Multiple features needed the same access pattern: two users can see rows in the same table, but with different visibility rules. Comments are visible to the commenter (their own) and the prompt author (all on their prompt). Feedback forms are visible to the reviewer (all states, own form only) and the reviewee (locked state only, feedback about them). This pattern repeats and has non-obvious gotchas.

## What We Learned

### 1. Multiple SELECT policies combine with OR, not AND

PostgreSQL RLS evaluates all applicable policies for a given operation and combines them with OR. This is the key insight that makes the two-party pattern work without subqueries or UNION:

```sql
-- Comment author sees their own
CREATE POLICY "Authors manage own comments"
  ON prompt_comments FOR ALL
  USING ((SELECT auth.uid()) = author_id)
  WITH CHECK ((SELECT auth.uid()) = author_id);

-- Prompt author sees all comments on their prompt
CREATE POLICY "Prompt author reads comments"
  ON prompt_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = prompt_comments.prompt_id
      AND prompts.author_id = (SELECT auth.uid())
    )
  );
```

A query by the prompt author matches the second policy. A query by the commenter matches the first. A query by an unrelated user matches neither and returns zero rows (not an error).

### 2. FOR ALL vs FOR SELECT creates an asymmetric write model

The comment author's policy is `FOR ALL` -- they can INSERT, UPDATE, SELECT, DELETE their own rows. The prompt author's policy is `FOR SELECT` only -- they can read but not modify other users' comments. This is intentional: the prompt author should see all responses but never alter them.

For feedback forms, this becomes more nuanced: the reviewer gets both SELECT and UPDATE (they fill out the form), but the reviewee gets only SELECT on locked forms (they can read the revealed feedback but never change it). Inserts are handled entirely by SECURITY DEFINER functions.

### 3. State-gated visibility prevents premature reveals

The feedback form's reviewee policy includes a state check:

```sql
CREATE POLICY "Reviewee reads locked feedback"
  ON feedback_forms FOR SELECT
  USING (
    (SELECT auth.uid()) = reviewee_id
    AND state = 'locked'
  );
```

Before both parties submit, the reviewee cannot see the reviewer's form content at all. A direct `SELECT * FROM feedback_forms WHERE reviewee_id = me` returns zero rows for forms in `due` or `submitted` state. This is the simultaneous-reveal mechanism: neither party sees the other's feedback until both have committed.

The important subtlety: this means the reviewee also cannot see whether a form EXISTS before it's locked. They have no way to check whether the other party has submitted yet. This is deliberate -- it prevents social pressure to submit quickly.

### 4. Test with specific seed data, not row counts

The pgTAP tests (e.g., `rls_invitations.test.sql`) avoid `SELECT count(*)` comparisons because integration tests may leave behind data from other test runs. Instead they use `isnt_empty` and `results_eq` against specific seed IDs:

```sql
SELECT isnt_empty(
  $$ SELECT * FROM prompt_invitations
     WHERE prompt_id = 'seed-prompt-other'
     AND inviter_id = '11111111-1111-1111-1111-111111111111' $$,
  'Inviter can see their own invitations'
);
```

This makes RLS tests deterministic even when the database isn't freshly seeded.

### 5. Silent failure of unauthorized writes through RLS

Supabase/PostgreSQL RLS does not raise errors for unauthorized writes -- it silently returns zero affected rows. The invitations test verifies this:

```sql
-- Direct update by invitee does not throw...
SELECT lives_ok(
  $$ UPDATE prompt_invitations SET state = 'accepted' ... $$);
-- ...but the state didn't change
SELECT results_eq(
  $$ SELECT state FROM prompt_invitations ... $$,
  $$ VALUES ('pending'::text) $$);
```

This means service code that calls `.update()` must check the returned row count and not assume success. If the update returns zero rows, the operation was silently rejected by RLS.

## The Fix / Pattern

When building a two-party access model:

1. Create separate policies per party -- do not try to combine them into one policy
2. Use `FOR ALL` for the owning party, `FOR SELECT` for the viewing party
3. Add state conditions to visibility policies when data should be revealed conditionally
4. All mutations that cross party boundaries go through SECURITY DEFINER functions
5. Test RLS with known seed data, not aggregate counts
6. After any `.update()` or `.delete()`, check that rows were actually affected

## Why This Matters

This pattern appears at least 3 times in the current codebase (comments, invitations, feedback forms) and will appear again for any feature where two users interact. Getting the policy combination semantics wrong leads to either data leaks (reviewee sees feedback before locking) or broken queries (no results when results should exist). The silent-failure behavior of unauthorized writes is particularly dangerous -- it can mask bugs where the caller has insufficient RLS privileges.
