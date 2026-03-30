---
status: pending
priority: p1
issue_id: "096"
tags: [code-review, security, testing]
dependencies: []
---

# Test harness security: incomplete scope + new findings

## Problem Statement

Plan Item 2 security fixes are mostly correct but have gaps identified by security sentinel and TypeScript reviewer.

## Findings

### Scope incomplete on email domain change
- `tests/e2e/core-flow.test.ts:13` also uses `sophie@dyad.berlin` in a find query — not called out in plan
- `tests/helpers/auth.ts` uses `@test.local` (inconsistent with planned `@test.invalid`) — unify both

### Cleanup deletes have no error handling (TypeScript reviewer)
- `core-flow.test.ts:80-85` — `.delete().eq()` calls return PostgrestResponse with no error check
- Silent FK failures leave orphaned data, causing the exact problem Item 1 tries to fix
- Add `.throwOnError()` to all cleanup deletes

### Signup test orphan user cleanup (Security sentinel NEW-2)
- If signup test crashes between signUp and cleanup, auth user persists with known password
- Add beforeAll sweep: delete any user matching `signup-test@test.invalid`

### CI service role key sourcing (Security sentinel NEW-1)
- Plan says "set env vars inline" but doesn't specify how service role key reaches CI
- Use `supabase status -o env` to parse keys from running instance, not hardcode

### Cross-reference todo #093 (Security sentinel NEW-5)
- Hardcoded test passwords tracked in existing todo but not referenced in plan

## Acceptance Criteria

- [ ] All `@dyad.berlin` references in test files changed to `@test.invalid`
- [ ] `@test.local` in auth helpers unified to `@test.invalid`
- [ ] `.throwOnError()` on all cleanup delete chains
- [ ] Signup test has beforeAll orphan sweep
- [ ] CI parses keys from `supabase status -o env`
- [ ] Plan sources section references todo #093
