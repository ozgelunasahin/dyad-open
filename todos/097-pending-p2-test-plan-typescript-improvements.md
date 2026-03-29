---
status: pending
priority: p2
issue_id: "097"
tags: [code-review, typescript, testing]
dependencies: []
---

# Test harness TypeScript improvements

## Problem Statement

Admin client operations in E2E tests are completely untyped. Test user IDs are discovered at runtime via untyped `listUsers()`. These create fragile tests that fail at runtime instead of compile time.

## Findings

### Unparameterized SupabaseClient (TypeScript reviewer, HIGH)
- `createAdminClient()` returns `SupabaseClient` without `Database` generic
- All `.from('prompts').insert(...)` calls in E2E tests are untyped
- Column name typos or wrong value types only caught at runtime

### E2E users have no typed constant (TypeScript reviewer, MEDIUM)
- `core-flow.test.ts:12-13` discovers sophie's ID via `admin.auth.admin.listUsers()` + `.find()`
- Returns loosely-typed `users?.users` array with no narrowing
- Adding lisa for admin tests compounds this

### Localhost guard should be assertion function (TypeScript reviewer, MEDIUM)
- Plan says "add assertion" but doesn't specify TypeScript pattern
- Use `asserts url is \`http://127.0.0.1${string}\`` for type narrowing

## Proposed Solutions

### Option A: Generate Supabase types + typed constants (RECOMMENDED)

Run `supabase gen types typescript` to generate `Database` type. Parameterize both client helpers. Add `E2E_USERS` constant with IDs, emails, storage state paths.

- **Pros:** catches schema drift at compile time, typed cleanup operations
- **Cons:** moderate effort, types need regenerating after migrations
- **Effort:** Medium
- **Risk:** Low

## Acceptance Criteria

- [ ] `createAdminClient()` returns `SupabaseClient<Database>`
- [ ] `E2E_USERS` typed constant with sophie, tom, lisa
- [ ] Localhost guard uses TypeScript assertion function
- [ ] All test `.insert()` and `.delete()` calls type-checked
