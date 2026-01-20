# feat: Shared Note Awareness UX

## Overview

Keep the current user-scoped note model but add UX to help users understand when they're viewing/editing a note that exists on other canvases. Prevent accidental destruction of content they didn't realize was shared.

## Problem Statement

**Current behavior:**
1. User on Canvas A clicks `[[meeting-notes]]`
2. Note opens - but it already existed from Canvas B
3. User thinks "this isn't what I wanted" and deletes the content
4. Content is now gone from Canvas B too - unintended data loss

**The issue isn't the data model - it's lack of awareness.**

## Proposed Solution

### 1. Detect "Note Already Exists Elsewhere"

When user clicks a broken wikilink that creates/opens a note, check if that note already has positions on OTHER canvases.

```typescript
// In canvasStore or API
async function getNoteCanvasPresence(noteSlug: string): Promise<string[]> {
  const { data } = await supabase
    .from('card_positions')
    .select('canvas_id, canvases(name)')
    .eq('note_id', noteSlug);

  return data?.map(d => d.canvases.name) ?? [];
}
```

### 2. Show "Shared Note" Indicator

When opening a note that exists on other canvases, show a subtle indicator:

```
┌─────────────────────────────────────────┐
│ Meeting Notes                           │
│ 📎 Also on: Research, Personal          │  ← New indicator
├─────────────────────────────────────────┤
│ [note content...]                       │
└─────────────────────────────────────────┘
```

**Design:**
- Small, non-intrusive line below title
- Lists other canvas names where this note appears
- Only shown when note exists on 2+ canvases

### 3. Prompt on Destructive Actions

When user is about to delete or clear a shared note, show confirmation:

```
┌─────────────────────────────────────────────────┐
│ This note appears on other canvases             │
│                                                 │
│ Deleting will also remove it from:              │
│ • Research                                      │
│ • Personal                                      │
│                                                 │
│ [Cancel]  [Delete Anyway]  [Copy & Delete]      │
└─────────────────────────────────────────────────┘
```

**"Copy & Delete" option:**
- Creates a copy of the note with a new slug (e.g., `meeting-notes-copy`)
- Removes the card from current canvas
- Original note remains on other canvases
- User can then work on their copy independently

### 4. Option to "Make Local Copy"

Add a card menu option for shared notes:

```
[⋮] Card Menu
├── Edit (e)
├── Make Local Copy    ← New option (only shown for shared notes)
└── Close (Backspace)
```

**"Make Local Copy" behavior:**
1. Creates new note: `{slug}-copy` or `{slug}-{canvas-name}`
2. Copies content from original
3. Replaces card on current canvas with the copy
4. Original note unchanged on other canvases

## Technical Approach

### Phase 1: Shared Note Detection

Add API endpoint to check note presence:

```typescript
// src/routes/api/notes/[slug]/presence/+server.ts
export async function GET({ params, locals }) {
  const { slug } = params;
  const userId = locals.session?.user?.id;

  const { data } = await locals.supabase
    .from('card_positions')
    .select(`
      canvas_id,
      canvases!inner(id, name, slug)
    `)
    .eq('note_id', slug)
    .eq('canvases.user_id', userId);

  return json({
    canvases: data?.map(d => ({
      id: d.canvas_id,
      name: d.canvases.name
    })) ?? []
  });
}
```

### Phase 2: UI Indicator

Update NoteCard to show shared indicator:

```svelte
<!-- src/lib/components/NoteCard.svelte -->
<script>
  let otherCanvases = $state<string[]>([]);

  $effect(() => {
    if (card.note.id) {
      fetchNotePresence(card.note.id).then(canvases => {
        // Filter out current canvas
        otherCanvases = canvases
          .filter(c => c.id !== currentCanvasId)
          .map(c => c.name);
      });
    }
  });
</script>

{#if otherCanvases.length > 0}
  <div class="shared-indicator">
    Also on: {otherCanvases.join(', ')}
  </div>
{/if}
```

### Phase 3: Delete Confirmation

Update exitEditMode empty-note handling:

```typescript
// In NoteCard.svelte exitEditMode()
if (isEmpty) {
  const presence = await fetchNotePresence(card.note.id);
  const otherCanvases = presence.filter(c => c.id !== currentCanvasId);

  if (otherCanvases.length > 0) {
    const action = await showSharedNoteDeletePrompt(otherCanvases);

    if (action === 'cancel') {
      return; // Don't delete
    } else if (action === 'copy-and-remove') {
      await copyNoteAndRemoveCard(card);
      return;
    }
    // action === 'delete' falls through to existing delete logic
  }

  // Existing delete logic...
}
```

### Phase 4: "Make Local Copy" Action

```typescript
// In canvasStore
async function makeLocalCopy(cardId: string): Promise<void> {
  const card = this.cards.get(cardId);
  if (!card) return;

  const newSlug = generateCopySlug(card.note.slug);

  // Create new note with copied content
  await fetch(`/api/notes/${newSlug}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: `${card.note.title} (Copy)`,
      content: card.note.content
    })
  });

  // Replace card with new note
  this.replaceCardNote(cardId, newSlug);
}

function generateCopySlug(slug: string): string {
  // Try slug-copy, slug-copy-2, etc.
  let candidate = `${slug}-copy`;
  let counter = 2;
  while (this.vault.notes[candidate]) {
    candidate = `${slug}-copy-${counter}`;
    counter++;
  }
  return candidate;
}
```

## Acceptance Criteria

- [ ] Shared note indicator shows canvas names where note also appears
- [ ] Indicator only appears for notes on 2+ canvases
- [ ] Deleting/clearing shared note shows confirmation prompt
- [ ] "Copy & Delete" creates independent copy, removes from current canvas
- [ ] "Make Local Copy" menu option available for shared notes
- [ ] Copying preserves all content including wikilinks

## Files to Modify

- `src/routes/api/notes/[slug]/presence/+server.ts` (NEW)
- `src/lib/components/NoteCard.svelte` - Add indicator, update delete flow
- `src/lib/stores/canvas.svelte.ts` - Add makeLocalCopy(), replaceCardNote()
- `src/lib/components/SharedNotePrompt.svelte` (NEW)

## What This Does NOT Do

- **No schema changes** - keeps user-scoped notes
- **No migration** - zero database changes
- **No breaking changes** - existing behavior preserved
- **No new data model complexity** - just UI awareness

## Open Question for User Testing

> "When you click a wikilink and it opens a note that already has content from another canvas, what do you expect to happen?"

Options to test:
1. **Current + awareness**: Open the shared note, show indicator
2. **Prompt first**: "This note exists on Canvas B. Open shared note or create new?"
3. **Always copy**: Automatically create a canvas-local copy

Start with Option 1 (least disruptive), gather feedback, iterate.

## Future Considerations (Not Building Now)

If users consistently want canvas isolation:
- Consider "Copy on Open" as default behavior
- Consider canvas-scoped notes (the original complex plan)
- But validate with real usage first

---

*"The best code is no code. The best migration is no migration."* - DHH review
