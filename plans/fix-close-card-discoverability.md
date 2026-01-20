# Plan: Improve Close Card Discoverability

## Problem Statement

**User feedback:** "How do I close a subtext I once clicked open?"

Users don't know how to close child cards after opening them. The current interaction model isn't obvious.

## Current Behavior

To close a child card:
- Press `Escape` when focused on the child
- Click on the parent card (shifts focus, implicitly "closes" by dimming)

Neither of these is discoverable without documentation.

## Proposed Solutions

### Option A: Add visual close button (Recommended)

Add a subtle "×" close button to each child card:
- Appears on hover or when card is focused
- Positioned in top-right corner
- Clicking closes the card and returns focus to parent

```svelte
<!-- In NoteCard.svelte -->
{#if card.parentId}
  <button
    class="close-button"
    onclick={() => canvasStore.unopenCard(card.id)}
    title="Close (Escape)"
  >
    ×
  </button>
{/if}
```

### Option B: Tooltip/hint on first use

Show a one-time hint: "Press Escape to close this card"
- Appears first time user opens a child card
- Dismissed after seeing once (localStorage flag)

### Option C: Breadcrumb navigation

Show breadcrumb trail: `Parent > Child`
- Clicking parent in breadcrumb closes child
- More complex but clearer mental model

**Recommendation:** Option A - simple close button is most intuitive

## Implementation Details

### Files to modify:
- `src/lib/components/NoteCard.svelte` - Add close button

### Close Button Styling

```css
.close-button {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  opacity: 0;
  transition: opacity 0.2s;
  cursor: pointer;
  font-size: 16px;
}

.text-block:hover .close-button,
.text-block.focused .close-button {
  opacity: 0.5;
}

.close-button:hover {
  opacity: 1;
}
```

## Test Plan

1. [ ] Click wikilink to open child card
2. [ ] Close button appears on child card (on hover/focus)
3. [ ] Clicking close button closes the card
4. [ ] Focus returns to parent card
5. [ ] Close button does NOT appear on root/orphan cards
6. [ ] Escape key still works as before

## Edge Cases

- Root cards should NOT have close button (they can't be closed)
- Multiple levels of nesting - each child should have close button
- Close button shouldn't interfere with card content interaction
