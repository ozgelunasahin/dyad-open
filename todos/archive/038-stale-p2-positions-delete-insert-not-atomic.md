---
status: pending
priority: p2
id: "038"
tags: [code-review, performance, data-integrity]
---

# Positions Endpoint Uses Non-Atomic DELETE+INSERT

## Problem Statement

The PUT handler in `src/routes/api/canvases/[canvasId]/positions/+server.ts` (lines 100-129) first deletes all positions for a canvas, then inserts new ones. This creates a window where positions are missing if the insert fails after the delete, causing data loss.

## Findings

### Performance Oracle Agent

- Line 100-129: DELETE all positions, then INSERT new positions
- Non-atomic: if insert fails after delete, all positions are lost
- Doubles database operations (2 calls instead of 1)
- Called via debounce every ~1 second during editing

## Proposed Solutions

### Option A: Use Supabase upsert (Recommended)
Use `.upsert()` with `onConflict` on a composite unique key (canvas_id, note_id), then delete positions no longer present.
- **Pros:** Atomic per-row, more efficient, no data loss window
- **Cons:** Requires unique constraint on (canvas_id, note_id) — may need migration
- **Effort:** Medium
- **Risk:** Low

### Option B: Wrap in database transaction via RPC
Create a Supabase RPC function that performs delete+insert atomically.
- **Pros:** Fully atomic, no data loss possible
- **Cons:** Requires SQL function + migration
- **Effort:** Medium
- **Risk:** Low

## Technical Details

**Affected files:**
- `src/routes/api/canvases/[canvasId]/positions/+server.ts`

## Acceptance Criteria

- [ ] Position save is atomic — no window of missing positions
- [ ] Position save uses single DB operation where possible
- [ ] No regression in position persistence behavior
