---
status: complete
priority: p1
issue_id: "004"
tags: [code-review, data-integrity, critical, database]
dependencies: []
---

# Non-Atomic Card Position Save (Race Condition / Data Loss Risk)

## Problem Statement

The `saveCardPositions` function performs DELETE ALL then INSERT ALL without a database transaction. If the process crashes or network fails between operations, all card positions for that canvas are permanently lost.

**Why it matters**: Data loss for users - their canvas layout disappears with no recovery path.

## Findings

### Data Integrity Guardian Agent

**File**: `src/lib/server/db/operations.ts:205-222`

```typescript
export async function saveCardPositions(
    canvasId: string,
    positions: NewCardPosition[]
): Promise<void> {
    // Delete all existing positions for this canvas first
    await db.delete(cardPositions).where(eq(cardPositions.canvasId, canvasId));

    // INSERT IS NOT ATOMIC WITH DELETE!
    if (positions.length > 0) {
        await db.insert(cardPositions).values(/* ... */);
    }
}
```

**Failure Scenario**:
1. User A opens canvas with 50 cards
2. User A makes a change, triggering save
3. DELETE executes successfully
4. Server crashes / network error / process restarts
5. INSERT never executes
6. Canvas permanently loses all 50 card positions

## Proposed Solutions

### Option A: Wrap in Transaction (Recommended)
- **Description**: Use Drizzle's transaction API to make both operations atomic
- **Pros**: Guaranteed atomicity, rollback on failure
- **Cons**: Slightly more complex code
- **Effort**: Small (15 minutes)
- **Risk**: Low

```typescript
export async function saveCardPositions(
    canvasId: string,
    positions: NewCardPosition[]
): Promise<void> {
    await db.transaction(async (tx) => {
        await tx.delete(cardPositions).where(eq(cardPositions.canvasId, canvasId));
        if (positions.length > 0) {
            await tx.insert(cardPositions).values(
                positions.map((pos) => ({
                    ...pos,
                    id: pos.id || nanoid(),
                    canvasId
                }))
            );
        }
    });
}
```

### Option B: Use Upsert Pattern
- **Description**: ON CONFLICT DO UPDATE instead of delete-all
- **Pros**: More efficient, no window of missing data
- **Cons**: Need to handle orphaned positions separately
- **Effort**: Medium
- **Risk**: Low

## Recommended Action

**Option A** - Wrap in transaction. Simple and addresses the critical issue immediately.

## Technical Details

**Affected files**:
- `src/lib/server/db/operations.ts`

**Testing checklist**:
- [ ] Successful save still works
- [ ] Partial failure rolls back correctly (test by throwing mid-transaction)
- [ ] Canvas positions persist correctly

## Acceptance Criteria

- [ ] DELETE and INSERT wrapped in transaction
- [ ] Failure during save doesn't result in data loss
- [ ] Existing functionality preserved

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by data-integrity-guardian agent |

## Resources

- PR: feat/user-management-canvas-publishing
- Drizzle Transactions: https://orm.drizzle.team/docs/transactions
