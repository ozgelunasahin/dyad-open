---
status: complete
priority: p1
issue_id: "004"
tags: [code-review, race-condition, state-management]
dependencies: []
---

# Race Condition: Edit Mode Not Claimed Before Async Fetch

## Problem Statement

In `enterEditMode()`, the async fetch occurs BEFORE claiming `editingCardId`. During this window, another card can also enter edit mode, causing state inconsistency and focus hijacking.

## Findings

**Source:** Julik Frontend Races Reviewer, Architecture Strategist

**Evidence:**
- `src/lib/components/NoteCard.svelte` lines 53-75
- Lines 58-69: Async fetch happens first
- Line 71: `canvasStore.enterEditMode(card.id)` only after fetch completes
- ~50-500ms window where edit mode is unclaimed

**Sequence:**
1. User double-clicks card A
2. Card A starts fetch (doesn't claim edit mode yet)
3. User quickly clicks card B
4. Card B starts fetch (A hasn't claimed yet)
5. Both fetches complete
6. Both call `enterEditMode()`
7. Last one "wins", but brief visual glitch occurs

## Proposed Solutions

### Option A: Claim edit mode FIRST (Recommended)
- **Pros:** Prevents race entirely
- **Cons:** Brief moment without originalMarkdown
- **Effort:** Small (30 minutes)
- **Risk:** Low

```typescript
async function enterEditMode() {
    // Claim immediately, before any async
    if (canvasStore.editingCardId && canvasStore.editingCardId !== card.id) {
        canvasStore.exitEditMode();
    }
    canvasStore.enterEditMode(card.id);

    // Now load data (we already own edit mode)
    try {
        const res = await fetch(`/api/notes/${card.note.id}`);
        // ...
    } catch { /* ... */ }

    await tick();
    contentEl?.focus();
}
```

### Option B: Add entering guard
- **Pros:** Prevents multiple enter attempts
- **Cons:** More state to manage
- **Effort:** Small
- **Risk:** Low

```typescript
let isEnteringEditMode = false;

async function enterEditMode() {
    if (isEnteringEditMode) return;
    isEnteringEditMode = true;
    try { /* ... */ } finally { isEnteringEditMode = false; }
}
```

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/lib/components/NoteCard.svelte`

### Components
- NoteCard edit mode entry

## Acceptance Criteria

- [ ] Only one card can be in edit mode at a time
- [ ] Rapid clicking between cards doesn't cause visual glitches
- [ ] Focus is deterministic (always ends up on the clicked card)
- [ ] Test on slow network

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by julik-frontend-races-reviewer agent |

## Resources

- Test by throttling network and clicking rapidly between cards
