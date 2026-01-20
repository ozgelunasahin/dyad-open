# Plan: Edit Mode Persistence

## Problem Statement

**User feedback:** "I start off in edit mode, and make a new link. When I'm done and come back to the parent/main text, I'd like to be back in edit mode. Right now I need to double click to continue writing on the main."

When a user is writing and creates a wikilink, the flow is:
1. User is in edit mode on parent card
2. User creates a link (types `[[target]]` or uses `Cmd+K`)
3. Link click opens child card, user edits child
4. User presses Escape or clicks away from child
5. Focus returns to parent card BUT **edit mode is lost**
6. User must double-click to continue writing

This breaks the writing flow.

## Current Behavior

In `wikilink.ts`, when a link is created via `[` or `Cmd+K`, it calls:
```typescript
this.options.onWikilinkClick?.(target);
```

This triggers `handleWikilinkClick` in `NoteCard.svelte` which:
1. Calls `exitEditMode()` if currently editing
2. Opens the linked card

When returning to parent, there's no memory of previous edit state.

## Proposed Solution

Track edit mode state before navigating away, restore it on return.

### Option A: Store-based approach (Recommended)

Add `previousEditingCardId` to canvas store:

```typescript
// canvas.svelte.ts
let previousEditingCardId: string | null = null;

exitEditMode(): void {
  previousEditingCardId = this.editingCardId;
  this.editingCardId = null;
}

// When focus returns to a card that was previously editing
restoreEditModeIfNeeded(cardId: string): void {
  if (previousEditingCardId === cardId) {
    this.enterEditMode(cardId);
    previousEditingCardId = null;
  }
}
```

### Option B: Don't exit edit mode on link click

Instead of exiting edit mode when clicking a link, keep the parent in edit mode while viewing child. This might be more intuitive but could have UI implications.

## Implementation Details

### Files to modify:
- `src/lib/stores/canvas.svelte.ts` - Add edit state tracking
- `src/lib/components/NoteCard.svelte` - Restore edit mode on focus return

### Key changes:

1. **Track previous edit state:**
```typescript
// In canvasStore
previousEditingCardId = $state<string | null>(null);

exitEditMode(): void {
  this.previousEditingCardId = this.editingCardId;
  this.editingCardId = null;
}
```

2. **Restore on card focus:**
```typescript
// In NoteCard.svelte, when card becomes active
$effect(() => {
  if (isActive && !isEditing && canvasStore.previousEditingCardId === card.id) {
    canvasStore.enterEditMode(card.id);
    canvasStore.previousEditingCardId = null;
  }
});
```

## Test Plan

1. [ ] Start editing parent card
2. [ ] Create wikilink with `[[target]]` or `Cmd+K`
3. [ ] Click link to open child card
4. [ ] Press Escape to close child
5. [ ] Parent card should automatically be in edit mode
6. [ ] Verify cursor position is restored (bonus)

## Edge Cases

- Multiple nested navigations (A → B → C → back to A)
- User explicitly exits edit mode before navigation
- Clicking outside cards vs pressing Escape
