---
status: pending
priority: p2
issue_id: "031"
tags: [code-review, typescript, type-safety]
dependencies: []
---

# Fix Unsafe Type Assertions

## Problem Statement

Several locations use `as` type assertions that bypass TypeScript's type checking. These can hide bugs if the runtime value doesn't match the asserted type.

## Findings

### TypeScript Review

Unsafe assertions identified:

1. **Canvas.svelte** - Event target assertions:
   ```typescript
   const target = event.target as HTMLElement;
   ```
   Should use type guard: `if (event.target instanceof HTMLElement)`

2. **canvas.svelte.ts** - Map.get without null check:
   ```typescript
   const card = this.cards.get(cardId)!;  // Non-null assertion
   ```
   Should check for undefined

3. **JSON parsing** - Casting parsed JSON:
   ```typescript
   const data = JSON.parse(str) as SomeType;
   ```
   Should validate structure

## Proposed Solutions

### Option 1: Replace with Type Guards (Recommended)
**Pros:** Runtime safety, better error messages
**Cons:** Slightly more verbose
**Effort:** Small
**Risk:** Low

```typescript
// Before
const target = event.target as HTMLElement;

// After
if (!(event.target instanceof HTMLElement)) return;
const target = event.target;
```

### Option 2: Zod/Valibot Validation for JSON
**Pros:** Strong runtime validation
**Cons:** Dependency, setup overhead
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 for DOM assertions, consider Option 2 for API responses.

## Technical Details

**Affected Files:**
- `src/lib/components/Canvas.svelte`
- `src/lib/stores/canvas.svelte.ts`
- Various API handlers

## Acceptance Criteria

- [ ] No `as HTMLElement` without prior instanceof check
- [ ] No `!` assertions on Map.get() results
- [ ] JSON.parse results validated before use
- [ ] TypeScript strict mode passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from TypeScript review | Type guards are safer than assertions |

## Resources

- TypeScript reviewer findings
