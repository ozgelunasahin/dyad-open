---
status: pending
priority: p3
issue_id: "041"
tags: [code-review, code-quality, canvas-improvements]
dependencies: []
---

# Magic Number 50 for Link Position Approximation

## Problem Statement

In `restoreHiddenChain()`, the hardcoded value `50` is used to approximate link Y position. This is fragile and undocumented.

## Findings

**From TypeScript Reviewer (canvas.svelte.ts:1091-1097):**
```typescript
prevSourceBounds = {
    left: position.x + dimensions.width / 2,
    right: position.x + dimensions.width / 2,
    y: position.y + 50 // Approximate link position
};
```

The comment says "approximate link position" but:
- What is 50? Pixels from card top to first wikilink?
- If card layouts change, this will create incorrect connection points
- Different cards have different link positions

## Proposed Solutions

### Option A: Named Constant (Recommended)
Extract to named constant with documentation.

```typescript
/** Approximate Y offset from card top to first wikilink heading */
const HEADING_Y_OFFSET = 50;

// Usage
y: position.y + HEADING_Y_OFFSET
```

**Pros:** Self-documenting
**Cons:** Still an approximation
**Effort:** Small (15 min)
**Risk:** Very low

### Option B: Calculate from Content
Analyze card content to find actual link position.

**Pros:** Accurate
**Cons:** Complex, may not have DOM access at this point
**Effort:** High
**Risk:** Medium

## Technical Details

**Files to modify:**
- `src/lib/stores/canvas.svelte.ts`: Extract constant

## Acceptance Criteria

- [ ] Magic number replaced with named constant
- [ ] Comment explains what the value represents
- [ ] Consider if value should be in types.ts with other layout constants

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-18 | Created from code review | |

## Resources

- PR Branch: feat/canvas-improvements
