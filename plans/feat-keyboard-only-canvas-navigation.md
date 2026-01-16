# feat: Keyboard-Only Canvas Navigation

## Overview

Add intelligent keyboard navigation along the **active chain** - the reading path of opened cards. Two focus modes: **Card Focus** for navigating the chain, and **Link Focus** for following wikilinks.

**Branch:** `feat/keyboard-navigation`

---

## Design Principles

1. **No borders in reading mode** - visual vocabulary constraint. Use background tint only.
2. **Chain-based navigation** - Left/Right traverse the active chain
3. **Rightward extension only (for now)** - Following links extends chain to the right. Left-extension deferred pending usability testing.
4. **"Close" = unopen** - Remove from canvas view, NOT delete underlying data
5. **Chain visualization only in debug mode** - Not shown in reading mode

---

## The Active Chain Model

The **active chain** is the sequence of cards representing your current reading path.

```
Chain: [A] → [B] → [C]
        ↑      ↑      ↑
      left   middle  right (current)
```

**Navigation:**
- `ArrowLeft` → Move toward the origin (previous in chain)
- `ArrowRight` → Move toward the most recent (next in chain)
- `Delete` → **Unopen** current card, return to previous in chain

---

## Scenarios

### Straightforward Cases

**1. Extend chain rightward (standard reading flow)**
```
Before: [A]          User on A, Link Focus, ArrowRight/Enter on link to B
After:  [A] → [B]    B placed to right of A, focus on B
```

**2. Navigate existing chain (Card Focus)**
```
Chain: [A] → [B] → [C]    User on B
ArrowRight → focus C
ArrowLeft → focus A
```

**3. Extend from end of chain**
```
Chain: [A] → [B] → [C]    User on C (rightmost)
Link Focus, ArrowRight on link to D
Result: [A] → [B] → [C] → [D]
```

**4. Following link to already-open card**
```
Chain: [A] → [B] → [C]    User on C, link to A exists
Link Focus, Enter on link to A
Result: Focus moves to existing A, chain updated to include navigation
```

### Extending from Middle of Chain

**Important:** The active chain is the **navigation path**, not the set of displayed cards. When the chain is updated, cards remain visible—they just become "off-chain" (not reachable via arrow navigation).

**5. Extend from middle of chain (rightward)**
```
Chain: [A] → [B] → [C]    User on B
Link Focus, ArrowRight on link to D

Before:
  Chain: [A, B, C]
  Displayed cards: A, B, C

After:
  Chain: [A, B, D]         ← C removed from chain
  Displayed cards: A, B, C, D   ← C still visible! Just "off-chain"

C is still on the canvas. User can click it or follow a link to it.
Arrow navigation now goes A ↔ B ↔ D (C unreachable via arrows).
```

---

## Solution

### Keyboard Shortcuts

| Shortcut | Card Focus Mode | Link Focus Mode |
|----------|-----------------|-----------------|
| `Tab` | Enter Link Focus (first link) | Next link (wraps) |
| `Shift+Tab` | — | Previous link (wraps) |
| `ArrowUp` | — | Previous link |
| `ArrowDown` | — | Next link |
| `ArrowRight` | Navigate right in chain | **Follow link** (extend chain right) |
| `ArrowLeft` | Navigate left in chain | Exit Link Focus, navigate left in chain |
| `Enter` / `Space` | — | Follow link (extend chain right) |
| `Escape` | — | Exit to Card Focus |
| `Delete` | Unopen current card | Unopen current card |
| `e` | Enter edit mode | — |

### Visual Indicators

**Card Focus**: No change from current dimmed/non-dimmed style. **No extra box.**

**Link Focus**: Subtle background tint on focused wikilink. **No borders.**

```css
:global(.wikilink.link-focused) {
  background: color-mix(in srgb, var(--text-link) 12%, transparent);
  border-radius: 2px;
}
```

---

## Implementation

### Prerequisites (NoteCard.svelte)

**Add `data-note-id` attribute** to the foreignObject for DOM querying:

```svelte
<foreignObject
  data-note-id={card.id}
  x={card.position.x}
  y={card.position.y}
  ...
>
```

### State Changes (canvas.svelte.ts)

Add ~50 lines:

```typescript
// Link focus state
focusedLinkIndex = $state<number | null>(null);

// Derived
isLinkFocusMode = $derived(this.focusedLinkIndex !== null);

// Link focus actions
enterLinkFocusMode() {
  this.focusedLinkIndex = 0;
}

exitLinkFocusMode() {
  this.focusedLinkIndex = null;
}

focusNextLink(linkCount: number) {
  if (this.focusedLinkIndex === null || linkCount === 0) return;
  this.focusedLinkIndex = (this.focusedLinkIndex + 1) % linkCount;
}

focusPrevLink(linkCount: number) {
  if (this.focusedLinkIndex === null || linkCount === 0) return;
  this.focusedLinkIndex = (this.focusedLinkIndex - 1 + linkCount) % linkCount;
}

// Chain navigation: move left in chain
navigateLeftInChain(): boolean {
  if (!this.focusedCardId) return false;

  const currentIndex = this.activeChain.indexOf(this.focusedCardId);
  if (currentIndex <= 0) return false;

  const targetCardId = this.activeChain[currentIndex - 1];
  this.focusCard(targetCardId);
  return true;
}

// Chain navigation: move right in chain
navigateRightInChain(): boolean {
  if (!this.focusedCardId) return false;

  const currentIndex = this.activeChain.indexOf(this.focusedCardId);
  if (currentIndex < 0 || currentIndex >= this.activeChain.length - 1) {
    return false;
  }

  const targetCardId = this.activeChain[currentIndex + 1];
  this.focusCard(targetCardId);
  return true;
}

// Follow link and extend chain rightward
// Does NOT call openNote to avoid chain manipulation conflicts
followLinkToRight(
  noteId: string,
  fromCardId: string,
  linkPosition: Point
): boolean {
  // If note is already open, update chain and focus it
  if (this.cards.has(noteId)) {
    // Update chain to reflect navigation to this card
    const currentIndex = this.activeChain.indexOf(fromCardId);
    if (currentIndex >= 0) {
      // Truncate chain after current position, append target
      this.activeChain = [...this.activeChain.slice(0, currentIndex + 1), noteId];
    }
    this.focusCard(noteId);
    return true;
  }

  // Card doesn't exist - create it
  if (!this.vault) return false;
  const note = this.vault.notes[noteId];
  if (!note) return false;
  if (this.cards.size >= 50) return false; // MAX_CARDS

  // Calculate dimensions and position
  const dimensions = this.calculateCardDimensions(note.content);
  const parentCard = this.cards.get(fromCardId) ?? null;
  const existingCards = Array.from(this.cards.values());
  const existingPathPoints = this.getExistingPathPoints();

  const { position } = calculateNewCardPosition(
    parentCard,
    existingCards,
    linkPosition,
    dimensions,
    existingPathPoints
  );

  // Create new card
  const newCard: Card = {
    id: noteId,
    note,
    position,
    dimensions,
    parentId: fromCardId,
    sourceLink: linkPosition
  };
  this.cards.set(noteId, newCard);

  // Update chain: truncate after current, append new
  const currentIndex = this.activeChain.indexOf(fromCardId);
  if (currentIndex >= 0) {
    this.activeChain = [...this.activeChain.slice(0, currentIndex + 1), noteId];
  } else {
    this.activeChain = [...this.activeChain, noteId];
  }

  // Update history
  this.history.back.push([...this.activeChain]);
  this.history.forward = [];

  this.focusCard(noteId);
  this.persistState();
  return true;
}

// Unopen current card (remove from view, NOT delete data)
unopenCurrentCard(): boolean {
  if (!this.focusedCardId) return false;

  const cardToUnopen = this.focusedCardId;
  const currentIndex = this.activeChain.indexOf(cardToUnopen);

  // Find adjacent card (prefer left/parent in chain)
  const parentCardId = currentIndex > 0
    ? this.activeChain[currentIndex - 1]
    : (this.activeChain.length > 1 ? this.activeChain[1] : null);

  // Remove card from canvas (NOT from database)
  this.cards.delete(cardToUnopen);

  // Clean up connections referencing this card
  this.connections = this.connections.filter(
    conn => conn.fromCardId !== cardToUnopen && conn.toCardId !== cardToUnopen
  );

  // Clean up stored paths
  for (const [key] of this.storedPaths) {
    if (key.includes(cardToUnopen)) {
      this.storedPaths.delete(key);
    }
  }

  // Remove from active chain
  this.activeChain = this.activeChain.filter(id => id !== cardToUnopen);

  // Exit link focus mode
  this.exitLinkFocusMode();

  // Navigate to parent in chain or first remaining card
  if (parentCardId && this.cards.has(parentCardId)) {
    this.focusCard(parentCardId);
  } else if (this.activeChain.length > 0) {
    this.focusCard(this.activeChain[0]);
  } else {
    this.focusedCardId = null;
  }

  this.persistState();
  return true;
}
```

### Keyboard Handler (Canvas.svelte)

Update `handleKeyDown` (~45 lines):

```typescript
const handleKeyDown = (event: KeyboardEvent) => {
  if (canvasStore.editingCardId) return;
  if (event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement) return;

  // ... existing zoom/pan shortcuts (Ctrl+±0, Shift+Arrow) ...

  const focusedCard = canvasStore.focusedCardId;

  // Helper to get fresh wikilinks (avoid stale closure)
  const getWikilinks = (): HTMLElement[] => {
    const cardElement = focusedCard
      ? document.querySelector(`[data-note-id="${focusedCard}"]`)
      : null;
    return cardElement
      ? Array.from(cardElement.querySelectorAll('.wikilink'))
      : [];
  };

  // Helper to follow focused link
  const followFocusedLink = () => {
    const wikilinks = getWikilinks();
    const linkIndex = canvasStore.focusedLinkIndex;
    if (linkIndex === null || linkIndex >= wikilinks.length) return;

    const focusedLink = wikilinks[linkIndex];
    if (!focusedLink || !focusedCard) return;

    const target = focusedLink.dataset.target;
    if (!target) return;

    const rect = focusedLink.getBoundingClientRect();
    canvasStore.exitLinkFocusMode();
    canvasStore.followLinkToRight(
      target,
      focusedCard,
      { x: rect.left, y: rect.bottom }
    );
  };

  const linkCount = getWikilinks().length;

  // === LINK FOCUS MODE ===
  if (canvasStore.isLinkFocusMode) {
    if (event.key === 'Escape') {
      event.preventDefault();
      canvasStore.exitLinkFocusMode();
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      canvasStore.unopenCurrentCard();
      return;
    }

    if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
      event.preventDefault();
      canvasStore.focusNextLink(linkCount);
      return;
    }

    if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
      event.preventDefault();
      canvasStore.focusPrevLink(linkCount);
      return;
    }

    // ArrowRight, Enter, Space: follow link (rightward)
    if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      followFocusedLink();
      return;
    }

    // ArrowLeft: exit link focus, navigate left in chain
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      canvasStore.exitLinkFocusMode();
      canvasStore.navigateLeftInChain();
      return;
    }

    return; // Block other keys in link mode
  }

  // === CARD FOCUS MODE ===
  if (event.key === 'Tab' && linkCount > 0) {
    event.preventDefault();
    canvasStore.enterLinkFocusMode();
    return;
  }

  if (event.key === 'Delete') {
    event.preventDefault();
    canvasStore.unopenCurrentCard();
    return;
  }

  // Chain navigation
  if (event.key === 'ArrowLeft' && !event.altKey && !event.shiftKey) {
    event.preventDefault();
    canvasStore.navigateLeftInChain();
    return;
  }

  if (event.key === 'ArrowRight' && !event.altKey && !event.shiftKey) {
    event.preventDefault();
    canvasStore.navigateRightInChain();
    return;
  }

  if (event.key === 'e' && canvasStore.focusedCardId) {
    event.preventDefault();
    canvasStore.enterEditMode(canvasStore.focusedCardId);
  }
};
```

### Link Highlighting (NoteCard.svelte)

Add effect and CSS (~15 lines):

```typescript
$effect(() => {
  if (!noteElement) return;

  const wikilinks = noteElement.querySelectorAll('.wikilink');
  const linkIndex = canvasStore.focusedLinkIndex;

  wikilinks.forEach((link, index) => {
    // Clamp check: only highlight if index is valid
    const shouldHighlight = isActive &&
      linkIndex !== null &&
      linkIndex < wikilinks.length &&
      index === linkIndex;
    link.classList.toggle('link-focused', shouldHighlight);
  });
});
```

```css
:global(.wikilink.link-focused) {
  background: color-mix(in srgb, var(--text-link) 12%, transparent);
  border-radius: 2px;
}
```

### Remove Card Focus Box (NoteCard.svelte)

```css
/* DELETE this rule */
.text-block.focused {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--text-link) 40%, transparent);
  border-radius: 4px;
}
```

---

## Bug Fixes Applied

| Bug | Fix |
|-----|-----|
| `openNote` already modifies chain causing duplicates | Created `followLinkToRight()` that handles card creation and chain manipulation directly, avoiding conflict |
| Missing `data-note-id` attribute | Added to NoteCard.svelte prerequisites |
| Division by zero in `focusNextLink`/`focusPrevLink` | Added `linkCount === 0` guard |
| Stale wikilinks closure | Moved DOM query into `getWikilinks()` helper called fresh when needed |
| Missing connection/path cleanup | Added cleanup in `unopenCurrentCard()` |
| Inconsistent "already open" behavior | `followLinkToRight()` updates chain consistently whether card exists or not |

---

## Acceptance Criteria

- [ ] Tab enters Link Focus mode (focuses first wikilink)
- [ ] ArrowUp/Down navigates between links
- [ ] ArrowRight/Enter/Space in Link Focus follows link (extends chain right)
- [ ] ArrowLeft in Link Focus exits to Card Focus, navigates left in chain
- [ ] ArrowLeft/Right in Card Focus navigates existing chain
- [ ] Delete **unopens** current card (removes from view, keeps data)
- [ ] Escape exits Link Focus
- [ ] Focused link has subtle background tint (no border)
- [ ] No extra box around focused card
- [ ] Following link to already-open card updates chain and focuses it
- [ ] Build passes

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/stores/canvas.svelte.ts` | Add link focus, `followLinkToRight`, chain nav, `unopenCurrentCard` (~80 lines) |
| `src/lib/components/Canvas.svelte` | Update keyboard handler (~45 lines) |
| `src/lib/components/NoteCard.svelte` | Add `data-note-id`, link focus effect, remove card focus box (~20 lines) |

**Total: ~145 lines. No new files.**

---

## Known Edge Cases (Noted)

### Off-Chain Cards
When extending from middle of chain, some cards become "off-chain"—visible but not arrow-navigable. They can still be clicked or linked to.

### Deleting Only Card
If user deletes the only card in the chain, `focusedCardId` becomes `null`. Canvas is empty.

### Tab on Card with Zero Links
Tab does nothing (guarded by `linkCount > 0`).

---

## Deferred (Pending Usability Testing)

- **Left-extension** - ArrowLeft in Link Focus could follow link leftward. Deferred to see if users want this.

---

## Follow-Up PR: Layout & Routing

1. **Loop handling** - What happens when chain loops back
2. **Non-chain cards** - How to handle cards opened outside the chain
3. **Branching** - What if user follows different links from same card

---

## What's Deferred

- Help modal (`?` key)
- Vim motions in edit mode
- Fast pan / momentum scrolling
- Numbered link badges for quick selection
- Chain visualization (debug mode only)
- Left-extension (pending usability testing)
