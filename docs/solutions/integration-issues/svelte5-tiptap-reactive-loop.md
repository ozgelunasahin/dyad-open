---
title: "Svelte 5 + Tiptap Infinite Reactive Loop"
slug: "svelte5-tiptap-reactive-loop"
category: "integration-issues"
symptoms:
  - "Browser hangs at 'Loading...' or 'fetching' stage"
  - "Page becomes unresponsive when loading canvas with notes"
  - "CPU spikes to 100% without visible errors"
  - "Canvas page never finishes rendering NoteCard components"
components:
  - "NoteCard.svelte"
  - "TiptapEditor.svelte"
  - "canvas.svelte.ts (canvasStore)"
technologies:
  - "Svelte 5"
  - "$state runes"
  - "$derived runes"
  - "Tiptap editor"
  - "SvelteKit"
tags:
  - svelte5
  - tiptap
  - reactivity
  - infinite-loop
  - browser-hang
  - runes
severity: "critical"
date_solved: "2026-01-18"
related:
  - "docs/solutions/ui-bugs/svg-hop-over-arcs-not-rendering.md"
---

# Svelte 5 + Tiptap Infinite Reactive Loop

## Problem Summary

When using Tiptap editor within a Svelte 5 application, the browser would hang completely when loading the canvas page. The hang occurred before user interaction—simply having `NoteCard` components (which contain `TiptapEditor`) in the template with cards from the store's `cardList` caused an infinite reactive loop.

## Symptoms

- Browser hangs at "Loading..." or "fetching" stage
- Page becomes completely unresponsive
- CPU spikes to 100%
- No visible JavaScript errors in console
- Canvas page never finishes rendering

## Root Cause

The infinite loop occurred through this reactive chain:

```
1. TiptapEditor fires `onUpdate` (possibly during init/render)
2. handleEditorUpdate() calls canvasStore.updateNoteContent()
3. updateNoteContent() creates new Map: this.cards = new Map(this.cards)
4. cardList ($derived from cards) recomputes
5. Template has card={canvasStore.cardList[0]} - card prop changes
6. Component re-renders, TiptapEditor may fire onUpdate again
7. Return to step 2 → infinite loop → browser hang
```

### The Problematic Code

**NoteCard.svelte (before fix):**
```typescript
function handleEditorUpdate(json: JSONContent) {
  currentContent = json;
  canvasStore.updateNoteContent(card.note.id, json);  // THIS CAUSED THE LOOP
  scheduleSave();
}
```

**canvas.svelte.ts:**
```typescript
updateNoteContent(noteId: string, content: JSONContent): void {
  // ...
  const newCards = new Map(this.cards);
  newCards.set(noteId, updatedCard);
  this.cards = newCards;  // Triggers cardList to recompute
}

cardList = $derived(Array.from(this.cards.values()));  // Recomputes on cards change
```

## Investigation Process

We created **20+ isolated test pages** to bisect the issue:

| Test | Result | What It Proved |
|------|--------|----------------|
| TiptapEditor in div | ✅ Works | Editor alone is fine |
| TiptapEditor in foreignObject | ✅ Works | SVG context is fine |
| NoteCard with mock data | ✅ Works | NoteCard alone is fine |
| canvasStore.initialize() only | ✅ Works | Store init alone is fine |
| Store init + cardList iteration | ✅ Works | Reading cardList is fine |
| NoteCard + cardList without updateNoteContent | ✅ Works | **Key finding** |
| NoteCard + cardList WITH updateNoteContent | ❌ HANGS | **Root cause identified** |

<details>
<summary>Test files created during investigation (deleted after fix)</summary>

**Test pages** (`src/routes/test-*/`):
- test-tiptap, test-foreignobject, test-with-store
- test-canvas-init, test-import-store, test-import-notecard
- test-notecard-render, test-store-init, test-full-render
- test-cardlist, test-one-card, test-reference-only
- test-extract-script, test-no-type, test-if-cardlist
- test-always-false, test-notecard-no-store, test-snapshot-card
- test-no-notecard-template, test-notecard-no-init, test-simple-card-render
- test-simple-card-derived, test-simple-card-no-derived
- test-simple-with-editor, test-editor-no-link-check
- test-complex-content, test-with-effect, test-notecard-clone
- test-with-props, test-with-classes, test-with-handlers
- test-combined, test-with-store-calls, test-update-handler
- test-with-tick, test-safe-update, test-both-separate

**Test components** (`src/lib/components/SimpleCard*.svelte`):
- SimpleCard, SimpleCardNoDerived, SimpleCardWithEditor
- SimpleCardEditorNoLinkCheck, SimpleCardComplexContent
- SimpleCardWithEffect, SimpleCardWithProps, SimpleCardWithClasses
- SimpleCardWithHandlers, SimpleCardCombined, SimpleCardWithStoreCalls
- SimpleCardWithUpdateHandler, SimpleCardWithTick, SimpleCardSafeUpdate
- NoteCardClone

These were systematically created to isolate which combination of features caused the hang.
</details>

## Solution

### Code Changes

**NoteCard.svelte (after fix):**
```typescript
function handleEditorUpdate(json: JSONContent) {
  currentContent = json;
  // TODO: REVISIT THIS - We previously called canvasStore.updateNoteContent() here
  // for "instant view sync", but this caused an infinite reactive loop:
  // updateNoteContent() recreates the cards Map → cardList recomputes →
  // card prop changes → component re-renders → TiptapEditor fires onUpdate →
  // repeat. The exact mechanism isn't fully understood. For now, we only
  // update the store when saving. This may affect real-time sync if multiple
  // views of the same note exist.
  scheduleSave();
}

async function saveNow() {
  // ... after successful save:
  if (res.ok) {
    // Sync store after successful save (not on every keystroke)
    canvasStore.updateNoteContent(card.note.id, currentContent);
    // ...
  }
}
```

### Why This Works

| Aspect | Before | After |
|--------|--------|-------|
| Store updates per keystroke | 1 per character | 0 |
| Store updates per save | N/A | 1 |
| Reactive cascade risk | Every keystroke | Only after save |
| Edit responsiveness | Frozen | Smooth |

The fix breaks the synchronous reactive cycle by:
1. **Decoupling editing from store state** - Local `currentContent` absorbs changes
2. **Batching updates** - Multiple keystrokes coalesce into single store update
3. **Async boundary** - HTTP save creates natural break in call chain

## Trade-offs

**Limitation introduced:** If multiple views of the same note exist on canvas, they won't sync in real-time during editing. Updates only propagate after save (1.5s debounce).

**Why acceptable:**
- Duplicate views of same note are rare in current architecture
- Users typically edit one card at a time
- Save debounce is only 1.5 seconds

## Prevention Strategies

### Code Review Checklist

When reviewing Svelte 5 + editor integrations:

- [ ] Editor callbacks (onUpdate) do NOT directly update reactive stores
- [ ] Store methods called from editor callbacks are debounced
- [ ] Map/Set recreation in stores is minimized or batched
- [ ] Component props do not depend on $derived that updates per keystroke
- [ ] Editor content prop uses stable references

### Red Flags

| Pattern | Risk Level |
|---------|------------|
| `onUpdate` callback that calls store methods | HIGH |
| `new Map(existingMap)` in frequently-called store methods | MEDIUM |
| `$derived` used to create component props from mutable state | MEDIUM |
| Editor content passed as prop from reactive source | HIGH |

### Safe Pattern

```typescript
// Local state for editor content
let localContent = $state(initialContent);

// Debounced saves
function handleEditorUpdate(json: JSONContent) {
  localContent = json;  // Local only, no store
  scheduleSave();       // Debounced
}

// Update store only after successful save
async function saveNow() {
  await saveToServer(localContent);
  store.updateNoteContent(id, localContent);  // Safe here
}
```

## Related Files

- `src/lib/components/NoteCard.svelte` - Contains the fix
- `src/lib/stores/canvas.svelte.ts` - Map recreation pattern
- `src/lib/components/TiptapEditor.svelte` - Tiptap wrapper
- Test components in `src/lib/components/SimpleCard*.svelte` - Debug isolation

## Future Considerations

The exact mechanism of why Tiptap fires `onUpdate` during the reactive cascade isn't fully understood. Potential areas to investigate:

1. Does Tiptap's `onUpdate` fire during content prop changes?
2. Could `updateNoteContent` use in-place mutation for editor content?
3. Would a separate "editing content" store avoid this pattern?
4. Is this a known Svelte 5 + ProseMirror/Tiptap interaction issue?

## Search Terms

- svelte tiptap infinite loop
- svelte 5 editor hang
- tiptap reactive update loop
- svelte $derived infinite
- prosemirror svelte reactivity
