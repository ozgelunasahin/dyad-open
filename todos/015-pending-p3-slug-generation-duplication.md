---
status: pending
priority: p3
issue_id: "015"
tags: [code-review, duplication, code-quality]
dependencies: []
---

# Slug Generation Logic Duplicated 3 Times

## Problem Statement

The slug generation logic is copy-pasted in three locations, creating maintenance burden and inconsistency risk.

## Findings

### Pattern Recognition Agent

**Locations**:
- `src/routes/dashboard/+page.server.ts:33-37`
- `src/routes/canvas/[canvasId]/+page.server.ts:50-54`
- `src/routes/canvas/[canvasId]/+page.svelte:26-29`

**Duplicated code**:
```typescript
const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
```

## Proposed Solutions

### Option A: Extract to Utility (Recommended)
- **Description**: Create `$lib/utils/slug.ts`
- **Pros**: Single source of truth, testable
- **Cons**: None
- **Effort**: Small
- **Risk**: Low

```typescript
// $lib/utils/slug.ts
export function generateSlug(name: string, maxLength = 50): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, maxLength);
}
```

## Acceptance Criteria

- [ ] Slug utility function created
- [ ] All three locations updated to use utility
- [ ] Unit tests for slug generation

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by pattern-recognition-specialist agent |
