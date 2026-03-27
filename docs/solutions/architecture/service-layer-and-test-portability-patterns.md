---
title: Service layer and test portability patterns
category: architecture
tags: [service-layer, testing, supabase, portability, code-review]
components: [src/lib/services, tests/helpers, supabase/seed.sql]
date: 2026-03-25
prs: [30, 31]
---

# Service Layer and Test Portability Patterns

## Problem

We need a domain model and test infrastructure that isn't tightly coupled to Supabase, per the EU sovereignty requirements in `docs/design/shared-infrastructure-opportunities.md`. The codebase has 27 route handlers calling `locals.supabase.from()` directly. How do we introduce testable, portable code without refactoring everything?

## Decisions Made

### 1. Interface + implementation class for services

Services are TypeScript interfaces with `Supabase`-prefixed implementation classes:

```typescript
// Interface (portable — no Supabase dependency)
export interface PromptCommandService {
  create(authorId: string, data: {...}): Promise<Prompt>;
  publish(promptId: string, authorId: string, slots: TimeSlotInput[]): Promise<void>;
}

// Implementation (Supabase-specific — swappable)
export class SupabasePromptCommandService implements PromptCommandService {
  constructor(private supabase: SupabaseClient) {}
}
```

**Why not plain functions?** Classes give a natural place for private helpers (`getOwnPrompt`, `getOwnSlot`) and make the constructor-injection pattern explicit. The interface creates a compile-time boundary — consumers never import the Supabase implementation.

**Reviewed and defended:** The code simplicity reviewer flagged the test factory as YAGNI. We kept it because the factory is the single point of change when swapping backends — tests never see `SupabasePromptCommandService`, only `PromptCommandService`. This is an intentional architectural principle, not premature abstraction.

### 2. Service factory for test portability

```typescript
// tests/helpers/db.ts — the ONLY file that imports Supabase implementations
export function createServices(supabase: SupabaseClient): Services {
  return {
    promptCommand: new SupabasePromptCommandService(supabase),
    promptQuery: new SupabasePromptQueryService(supabase)
  };
}
```

Tests interact with interfaces. When we swap Supabase for plain Postgres + Drizzle/Kysely, only this factory changes.

### 3. Don't refactor existing routes — demonstrate the pattern in new code

The 27 existing `locals.supabase.from()` call sites are left untouched. New routes use the service layer. Existing routes migrate opportunistically when they need changes for other reasons. This avoids high-risk refactoring of stable code.

### 4. `auth.uid() IS NOT NULL` over `auth.role() = 'authenticated'`

RLS policies use `auth.uid() IS NOT NULL` for authenticated checks. This is more portable — it works with any auth system that sets a user context, not just GoTrue's role system.

### 5. Views for column-level privacy (exact_location)

RLS is row-level — it can't hide individual columns. To prevent authenticated users from querying `exact_location` directly via the Supabase client, we created a `time_slots_public` view that excludes the column:

```sql
CREATE VIEW time_slots_public AS
  SELECT id, prompt_id, start_time, duration_minutes,
         general_area, general_area_lat, general_area_lng,
         accepted, created_at
  FROM time_slots;
```

The query service reads from `time_slots_public`. The command service (author-only, writes) still uses the `time_slots` table directly. Views in Supabase inherit RLS from the underlying table.

**Why not column-level GRANT?** Column-level `REVOKE SELECT (exact_location)` would block the column for *all* authenticated users including authors. The view approach lets authors retain full table access via the `FOR ALL` RLS policy while restricting what non-owners can see through PostgREST/client queries.

**The security review caught this.** The original implementation relied on the service layer to strip `exact_location` from query results, but any authenticated user could bypass this by querying the table directly via the Supabase JS client. Defense-in-depth requires the database to enforce the privacy boundary, not just the application.

## Gotchas Discovered

### GoTrue seed data: empty strings, not NULL

When seeding `auth.users` via SQL, these columns MUST be set to `''` (empty string), not left NULL:

- `confirmation_token`
- `email_change`
- `email_change_token_new`
- `email_change_token_current`
- `recovery_token`

GoTrue's internal queries scan these as non-nullable strings. NULL values cause `signInWithPassword` to fail with `"Database error querying schema"` — a completely opaque error message.

### GoTrue seed data: `auth.identities` row required

Inserting into `auth.users` alone is not enough. GoTrue's `signInWithPassword` checks `auth.identities` for an email provider entry. Without it, login fails silently even though the user exists. The identity's `provider_id` must be set to the user UUID as a string.

### pgTAP and RLS: `throws_ok` doesn't work for row filtering

Supabase RLS with `USING` clauses on UPDATE/DELETE silently filters rows (0 affected) rather than raising errors. `throws_ok` in pgTAP will fail because no exception is raised. Use `lives_ok` + verify the row is unchanged instead.

### Supabase migration timestamps must be unique per day

Supabase CLI uses the date prefix (e.g., `20260325`) as the primary key in `schema_migrations`. Two migrations with the same date prefix cause a PK collision during `db reset`. Use different dates even if the migrations are logically related.

### pgTAP tests: reference seed IDs, not counts

pgTAP tests run against the same database as integration tests. If integration tests create data and don't clean up, row counts drift. Reference specific seed IDs (`WHERE id IN ('seed-prompt-published', ...)`) instead of counting by author.

### Pre-existing security functions in baseline dumps

When squashing migrations into a baseline via `pg_dump`, you inherit all existing grants. Audit `SECURITY DEFINER` functions and their grants — we found `confirm_user_email` and `get_registered_emails` callable by the `anon` role (email confirmation bypass + user enumeration). Always review baseline dumps for inherited privilege escalation.

## Prevention

- When adding new service code, always define an interface first and implement against it
- When writing tests, import from `tests/helpers/db.ts` factory, never from `src/lib/services/*` implementation files directly
- When seeding auth users, use the pattern in `supabase/seed.sql` with all token columns set to empty strings
- When writing pgTAP RLS tests, use row-count assertions not `throws_ok` for USING-based policies
- When hiding columns from non-owners, use a `_public` view — RLS is row-level only
- When squashing migrations into a baseline, audit all `SECURITY DEFINER` functions and `GRANT` statements
- When writing pgTAP tests, reference specific seed IDs not author-based counts (integration tests may leave data behind)
- When creating multiple migrations on the same day, use sequential dates (Supabase keys on date prefix)

## Related

- `docs/design/shared-infrastructure-opportunities.md` — sovereignty requirements driving these patterns
- `docs/plans/2026-03-24-feat-prompt-schema-crud-discover-plan.md` — service interface design
- `docs/plans/2026-03-25-feat-local-dev-infrastructure-plan.md` — test infrastructure decisions
- `todos/048-pending-p2-extract-configuration-constants.md` — hardcoded constants to extract
- `todos/049-pending-p1-input-validation-timeslot-fields.md` — validation gap found in security review
- `todos/051-pending-p2-extract-location-service-interface.md` — LocationService portability gap found in architecture review
- `docs/solutions/security-issues/column-level-access-and-security-definer-patterns.md` — column-level grants, SECURITY DEFINER patterns from Steps 4-5
