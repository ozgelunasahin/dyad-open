---
status: complete
priority: p1
issue_id: "002"
tags: [code-review, race-condition, data-integrity]
dependencies: []
---

# Race Condition: Double Save on Edit Mode Exit

## Problem Statement

When exiting edit mode, both `exitEditMode()` and the `$effect` watching `isEditing` trigger `saveNow()`, causing duplicate concurrent PUT requests. This can lead to data corruption and confusing UI states.

## Findings

**Source:** Julik Frontend Races Reviewer

**Evidence:**
- `src/lib/components/NoteCard.svelte` lines 78-84: `exitEditMode()` calls `saveNow()`
- `src/lib/components/NoteCard.svelte` lines 354-365: `$effect` also calls `saveNow()` when `wasEditing && !isEditing`

**Sequence:**
1. User presses Escape
2. `exitEditMode()` clears timer, calls `saveNow()`, sets `saveStatus = 'saving'`
3. `canvasStore.exitEditMode()` sets `editingCardId = null`
4. `$effect` detects transition, calls `saveNow()` AGAIN
5. Two PUT requests race to server

## Proposed Solutions

### Option A: Remove save from exitEditMode (Recommended)
- **Pros:** Single source of truth, cleaner code
- **Cons:** Relies on effect working correctly
- **Effort:** Small (30 minutes)
- **Risk:** Low

```typescript
async function exitEditMode() {
    // Don't save here - the $effect watching isEditing handles it
    clearTimeout(debounceTimer);
    canvasStore.exitEditMode();
}
```

### Option B: Remove save from $effect
- **Pros:** Explicit save on exit
- **Cons:** May miss edge cases where editing is cancelled externally
- **Effort:** Small
- **Risk:** Low

### Option C: Add guard flag
- **Pros:** Prevents duplicate saves regardless of trigger
- **Cons:** More state to manage
- **Effort:** Small
- **Risk:** Low

```typescript
let isSaving = false;
async function saveNow() {
    if (isSaving) return;
    isSaving = true;
    try { ... } finally { isSaving = false; }
}
```

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/lib/components/NoteCard.svelte`

### Components
- NoteCard edit mode

## Acceptance Criteria

- [ ] Only one save triggered when exiting edit mode
- [ ] Network tab shows single PUT request on exit
- [ ] "Saved" indicator behaves consistently
- [ ] All exit paths (Escape, click outside, 'e' on another card) work correctly

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by julik-frontend-races-reviewer agent |

## Resources

- Race condition occurs on slow networks (test with throttling)
