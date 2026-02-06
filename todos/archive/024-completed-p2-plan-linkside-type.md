---
status: completed
priority: p2
issue_id: "024"
tags: [code-review, plan-review, types, consistency]
dependencies: []
---

# Add Centralized LinkSide Type Definition

## Problem Statement

The plan mentions "Add `LinkSide` type if needed" but doesn't commit to it. The codebase already has a `Direction` type pattern that should be followed.

## Findings

### Pattern Recognition Review
Existing pattern in `src/lib/types/index.ts`:
```typescript
export type Direction = 'up' | 'down' | 'left' | 'right';
```

The plan uses inline `'left' | 'right'` union types in multiple places:
- `linkSide?: 'left' | 'right'` in function signatures
- Return type annotations

## Proposed Solutions

### Option 1: Add LinkSide Type (Recommended)
**Pros:** Consistent with existing patterns, better IDE support
**Cons:** One more type to maintain
**Effort:** Tiny
**Risk:** None

```typescript
export type LinkSide = 'left' | 'right';
```

### Option 2: Use Inline Union Types
**Pros:** No new type definition
**Cons:** Inconsistent, repetitive
**Effort:** None
**Risk:** Low

## Recommended Action

Option 1 - Add `LinkSide` type to `src/lib/types/index.ts` and update plan to use it.

## Technical Details

**Affected Files:**
- `src/lib/types/index.ts`
- `plans/feat-layout-and-connecting-lines.md`

## Acceptance Criteria

- [ ] `LinkSide` type added to types file
- [ ] Plan updated to reference the type
- [ ] All function signatures use `LinkSide` not inline union

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from plan review | Follow existing type patterns |

## Resources

- Pattern recognition review findings
- `src/lib/types/index.ts`
