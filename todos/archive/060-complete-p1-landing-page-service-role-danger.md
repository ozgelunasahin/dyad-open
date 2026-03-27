---
status: pending
priority: p1
issue_id: "060"
tags: [code-review, frontend-plan, security, phase-1]
dependencies: []
---

# Landing Page service_role Key Bypasses All RLS

## Problem Statement

The frontend plan recommends using a `service_role` Supabase client in `+page.server.ts` for the landing page to load published prompts for anonymous visitors. A `service_role` client bypasses ALL Row Level Security policies. If misused or leaked, it can read any row from any table: feedback forms, exact meeting locations, private drafts, user data.

Additionally, `PromptQueryService.getPublishedPrompts()` requires a `userId` parameter (to exclude the user's own prompts). For anonymous visitors, there is no userId — the interface needs a public variant.

## Findings

**Security review:** The service_role key is currently NOT imported anywhere in `src/`. It exists only in `scripts/` and `tests/helpers/auth.ts`. The plan would introduce it into production server code for the first time. A single developer mistake (reusing the client for another query, storing it on `locals`) could expose the entire database.

**Architecture review:** The service interface needs a `getPublishedPromptsPublic(region, limit)` method that does not take `userId` and does not filter by author.

## Proposed Solutions

### Option A: Anon RLS policy for published prompts (Recommended)
Add a narrow `anon` SELECT policy on the `prompts` table for published prompts only:
```sql
CREATE POLICY "Anonymous can read published prompts"
  ON prompts FOR SELECT TO anon
  USING (state = 'published');
```
Plus a matching policy on `time_slots_public` view. This grants only SELECT on a single table with a strict WHERE condition.

- **Pros:** Principle of least privilege, cannot be misused, no service_role in production
- **Cons:** Requires a migration, slightly more exposed surface
- **Effort:** Small (1 hour — migration + new service method)
- **Risk:** Low — the data is genuinely public

### Option B: Scoped service_role with strict containment
Create the service_role client locally in the `+page.server.ts` load function, never shared via `locals`, used for exactly one read-only query returning only public fields.

- **Pros:** No migration, simple implementation
- **Cons:** Introduces a dangerous pattern; future developers may copy it
- **Effort:** Small
- **Risk:** Medium — depends on discipline

## Recommended Action

Option A — anon RLS policy. Safer, more principled, and the data genuinely is public.

## Technical Details

- **Affected files:** `src/routes/+page.server.ts`, `src/lib/services/prompt-query.ts`
- **New migration:** Add anon SELECT policy for published prompts
- **New service method:** `getPublishedPromptsPublic(region?, limit?)`
- **Environment table:** Update CLAUDE.md — `SUPABASE_SERVICE_ROLE_KEY` stays "No" for production

## Acceptance Criteria

- [ ] Anonymous visitors can load published prompts on the landing page
- [ ] No service_role key used in production `src/` code
- [ ] New service method does not require userId parameter
- [ ] RLS policy restricts to `state = 'published'` only

## Resources

- Plan: `docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md` lines 70-75, 170-175
- Security patterns: `docs/solutions/security-issues/column-level-access-and-security-definer-patterns.md`
- Existing service: `src/lib/services/prompt-query.ts`
