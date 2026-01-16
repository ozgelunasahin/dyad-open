---
status: pending
priority: p2
issue_id: "005"
tags: [code-review, performance, database]
dependencies: []
---

# Missing Database Index on cardPositions.canvasId

## Problem Statement

The `cardPositions` table queries by `canvasId` but lacks an index. DELETE and SELECT operations perform full table scans, degrading performance as the table grows.

## Findings

### Performance Oracle Agent

**File**: `src/lib/server/db/schema.ts:47-60`

```typescript
export const cardPositions = sqliteTable('card_positions', {
    id: text('id').primaryKey(),
    canvasId: text('canvas_id')
        .notNull()
        .references(() => canvases.id, { onDelete: 'cascade' }),
    // ... no index defined
});
```

Operations affected:
- `getCardPositions()` - SELECT by canvasId
- `saveCardPositions()` - DELETE by canvasId

**Impact at scale**:
- 100 canvases × 20 cards = 2,000 rows → noticeable delay
- 1,000 canvases × 20 cards = 20,000 rows → significant performance impact

## Proposed Solutions

### Option A: Add Index in Schema (Recommended)
- **Description**: Add index on `canvasId` column
- **Pros**: Query performance improves dramatically
- **Cons**: Requires migration
- **Effort**: Small
- **Risk**: Low

```typescript
export const cardPositions = sqliteTable('card_positions', {
    // ... columns
}, (table) => ({
    canvasIdIdx: index('card_positions_canvas_idx').on(table.canvasId)
}));
```

## Recommended Action

**Option A** - Add index. Run `npm run db:push` to apply.

## Technical Details

**Affected files**:
- `src/lib/server/db/schema.ts`

Also consider indexes on:
- `shareLinks.canvasId`
- `sessions.userId`

## Acceptance Criteria

- [ ] Index added to cardPositions.canvasId
- [ ] Migration applied successfully
- [ ] Query performance verified with EXPLAIN

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by performance-oracle agent |
