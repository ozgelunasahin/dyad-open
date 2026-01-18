---
status: pending
priority: p2
issue_id: "038"
tags: [code-review, race-condition, canvas-improvements]
dependencies: []
---

# Edit Mode + Save + Navigation Race Condition

## Problem Statement

Users can navigate away while a save is in flight. The save completes and updates state for a card that was already closed, causing potential data inconsistency.

## Findings

**From Race Condition Reviewer (NoteCard.svelte:64-75):**
```typescript
async function exitEditMode() {
    if (currentContent && saveStatus !== 'saving') {
        await saveNow();  // ASYNC - network call in flight
    }
    canvasStore.exitEditMode();  // Runs after save

    if (currentContent && isContentEmpty(currentContent)) {
        canvasStore.unopenCard(card.id);
    }
}
```

**Race scenario:**
1. User presses Escape to exit edit mode
2. `saveNow()` starts (async network request)
3. User immediately presses ArrowLeft
4. `navigateLeftInChain()` runs, closes card via `unopenCard()`
5. Save completes, calls `canvasStore.updateNoteContent()` for deleted card
6. Dimension cache updated for ghost card

**Also noted:**
- `isEnteringEditMode` guard is per-instance, doesn't protect cross-card races
- No guard against navigating while editing

## Proposed Solutions

### Option A: Block Navigation During Save (Recommended)
Add state to track save status globally.

```typescript
// In canvasStore
private saveInProgress = $state<boolean>(false);

get isSaveInProgress(): boolean {
    return this.saveInProgress;
}

navigateLeftInChain(): boolean {
    if (this.isEditing || this.saveInProgress) return false;
    // ...
}
```

**Pros:** Prevents data corruption
**Cons:** Brief navigation delay during save
**Effort:** Small (1 hour)
**Risk:** Low

### Option B: Cancel Navigation on Save Complete
Let navigation proceed, but check card still exists in save callback.

**Pros:** More responsive
**Cons:** More complex error handling
**Effort:** Medium
**Risk:** Medium

## Technical Details

**Files to modify:**
- `src/lib/stores/canvas.svelte.ts`: Add save tracking, navigation guards
- `src/lib/components/NoteCard.svelte`: Signal save start/end to store

## Acceptance Criteria

- [ ] Cannot ArrowLeft while save is in flight
- [ ] Save completing on closed card doesn't crash
- [ ] Quick navigation after edit works when save is fast

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-18 | Created from code review | |

## Resources

- PR Branch: feat/canvas-improvements
- How to reproduce: Throttle network to Slow 3G, edit, Escape, ArrowLeft
