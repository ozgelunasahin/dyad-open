---
status: completed
priority: p2
issue_id: "025"
tags: [code-review, plan-review, code-quality, magic-numbers]
dependencies: []
---

# Replace Magic Numbers with Named Constants in Scoring

## Problem Statement

The layout scoring function uses magic numbers (200, 100, 300, 0.5) that are difficult to understand and tune. The plan perpetuates this pattern.

## Findings

### Pattern Recognition Review
Current code in `layout.ts`:
```typescript
score += yDistance * 0.5;
score += 0;   // preference
score += 100; // moderate
score += 200; // high
score += 300; // channel reuse
```

The plan proposes:
```typescript
score += 200;  // Magic number
```

## Proposed Solutions

### Option 1: Define Scoring Constants (Recommended)
**Pros:** Self-documenting, tunable, consistent
**Cons:** More code
**Effort:** Small
**Risk:** None

```typescript
const SCORING = {
    COLUMN_PENALTY_PREFERRED: 0,
    COLUMN_PENALTY_ADJACENT: 100,
    COLUMN_PENALTY_OPPOSITE: 200,
    COLUMN_PENALTY_FAR: 300,
    Y_DISTANCE_WEIGHT: 0.5,
    CHANNEL_REUSE_PENALTY: 300,
    PATH_CROSSING_PENALTY: 50,
    CARD_OVERLAP_PENALTY: 1000
} as const;
```

### Option 2: Document Existing Magic Numbers
**Pros:** Quick, low effort
**Cons:** Still hard to tune
**Effort:** Tiny
**Risk:** Low

## Recommended Action

Option 1 - Add scoring constants object to `layout.ts` and update plan to reference it.

## Technical Details

**Affected Files:**
- `src/lib/utils/layout.ts`
- `plans/feat-layout-and-connecting-lines.md`

## Acceptance Criteria

- [ ] `SCORING` constants object added to layout.ts
- [ ] All magic numbers replaced with constant references
- [ ] Plan updated to show constant usage

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-16 | Created from plan review | Named constants improve maintainability |

## Resources

- Pattern recognition review findings
- `src/lib/utils/layout.ts` lines 253, 263, 266, 269
