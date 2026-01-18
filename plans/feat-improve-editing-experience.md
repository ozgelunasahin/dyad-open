# Improve Editing Experience

Fix bugs and add quality-of-life features to the note editing experience.

## Overview

The current editing implementation in NoteCard.svelte uses contenteditable with HTML display and TurndownService for markdown conversion. While functional, it has performance issues, uses deprecated APIs, and lacks modern editor conveniences.

## Problem Statement

**Bugs:**
- P2-008: `convertWikilinks()` traverses entire DOM on every keystroke, causing lag at 500+ characters
- Deprecated `document.execCommand()` for bold/italic (may break in future browsers)
- No undo/redo integration with programmatic DOM changes

**Missing Features:**
- Auto-bracket wrapping (select text, press `[` to wrap as `[text]`)
- Wiki link quick-insert (type `[[` to auto-complete `[[]]` with cursor between)

## Proposed Solution

### Phase 1: Performance Fix (P2-008)

Optimize `convertWikilinks()` to only process changed text nodes instead of full DOM traversal.

**Current Implementation** (`NoteCard.svelte:241-298`):
```typescript
function convertWikilinks() {
  const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
  // Traverses ALL text nodes on every input event
}
```

**Proposed Approach:**
1. Use `beforeinput` event to capture the insertion point
2. Only scan the affected text node, not the entire DOM
3. Debounce conversion to batch rapid inputs

```typescript
// NoteCard.svelte
function handleBeforeInput(event: InputEvent) {
  if (event.isComposing) return; // Ignore IME composition
  if (event.data?.includes('[')) {
    // Schedule targeted wikilink conversion
    const ranges = event.getTargetRanges();
    const targetRange = ranges.length > 0 ? ranges[0] : null;
    if (targetRange) {
      scheduleWikilinkCheck(targetRange);
    }
  }
}
```

### Phase 2: Bracket Wrapping

Add auto-bracket wrapping when text is selected.

**Behavior:**
| Key | Selection | Result | Cursor After |
|-----|-----------|--------|--------------|
| `[` | "text" | `[text]` | After `]` |
| `(` | "text" | `(text)` | After `)` |
| `{` | "text" | `{text}` | After `}` |
| `[` | (none) | `[` | After `[` |

**Implementation:**
```typescript
// src/lib/utils/editor-shortcuts.ts
const BRACKET_PAIRS: Record<string, string> = {
  '[': ']',
  '(': ')',
  '{': '}'
};

export function handleBracketKey(
  event: KeyboardEvent,
  contentEl: HTMLElement
): boolean {
  // Ignore during IME composition
  if (event.isComposing) return false;

  const closingBracket = BRACKET_PAIRS[event.key];
  if (!closingBracket) return false;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;

  // Validate selection is within our content element
  const range = selection.getRangeAt(0);
  if (!contentEl.contains(range.commonAncestorContainer)) return false;

  const selectedText = range.toString();

  event.preventDefault();

  // Delete selected text
  range.deleteContents();

  // Insert wrapped text
  const textNode = document.createTextNode(`${event.key}${selectedText}${closingBracket}`);
  range.insertNode(textNode);

  // Position cursor after closing bracket
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);

  return true;
}
```

### Phase 3: Wiki Link Quick-Insert

When user types `[[`, auto-complete to `[[]]` with cursor between.

**Behavior:**
| Input | Context | Result | Cursor |
|-------|---------|--------|--------|
| `[[` | Empty/cursor | `[[❘]]` | Between brackets |
| `[[` | "text" selected | `[[text❘]]` | After text, before `]]` |

**Detection Strategy:**
```typescript
function handleKeyDown(event: KeyboardEvent) {
  // Ignore during IME composition
  if (event.isComposing) return;
  if (event.key !== '[') return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  // Check if previous character is '['
  const range = selection.getRangeAt(0);
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) return;

  const offset = range.startOffset;
  const text = textNode.textContent || '';

  if (offset > 0 && text[offset - 1] === '[') {
    event.preventDefault();
    insertWikiLinkBrackets(selection);
  }
}

function insertWikiLinkBrackets(selection: Selection) {
  const range = selection.getRangeAt(0);

  if (selection.isCollapsed) {
    // Insert []] (second [ plus closing ]]) with cursor between the brackets
    // First [ was already typed, so we insert []] to make [[|]]
    const textNode = document.createTextNode('[]]');
    range.insertNode(textNode);
    range.setStart(textNode, 1); // Position cursor after '[', before ']]'
    range.collapse(true);
  } else {
    // Wrap selection: [[selected]] - insert [selected]] since first [ exists
    const selectedText = range.toString();
    range.deleteContents();
    const textNode = document.createTextNode(`[${selectedText}]]`);
    range.insertNode(textNode);
    range.setStart(textNode, 1 + selectedText.length); // After '[' + selectedText, before ']]'
    range.collapse(true);
  }

  selection.removeAllRanges();
  selection.addRange(range);
}
```

### Phase 4: Replace Deprecated execCommand

Replace `document.execCommand('bold')` with modern Selection API.

**Current** (`NoteCard.svelte:207-215`):
```typescript
if (event.key === 'b' && (event.metaKey || event.ctrlKey)) {
  document.execCommand('bold');  // DEPRECATED
}
```

**Proposed:**
```typescript
export function toggleBold(contentEl: HTMLElement): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);

  // Validate selection is within our content element
  if (!contentEl.contains(range.commonAncestorContainer)) return;

  // Check if already wrapped in <strong>
  const parentStrong = range.commonAncestorContainer.parentElement?.closest('strong');

  if (parentStrong) {
    // Remove bold - unwrap
    const textNode = document.createTextNode(parentStrong.textContent || '');
    parentStrong.replaceWith(textNode);
  } else {
    // Add bold - wrap in <strong>
    // surroundContents throws if selection spans partial elements
    try {
      const strong = document.createElement('strong');
      range.surroundContents(strong);
    } catch {
      // Fallback: extract, wrap, and reinsert
      const selectedText = range.toString();
      range.deleteContents();
      const strong = document.createElement('strong');
      strong.textContent = selectedText;
      range.insertNode(strong);
    }
  }
}
```

## Technical Considerations

### Contenteditable Challenges
- Cursor position can be lost during programmatic DOM changes
- Use `tick()` after state changes before manipulating selection
- Save/restore selection around operations that modify innerHTML

### TurndownService Compatibility
Existing rules already handle:
- `<strong>` → `**text**`
- `<em>` → `*text*`
- Wikilink buttons → `[[target|display]]`

New bracket structures (`[text]`, `(text)`) are plain text and pass through unchanged.

### Performance Budget
- Keystroke handling: < 5ms
- Wikilink conversion: < 10ms for 1000 chars
- No full DOM traversal on every input

## Acceptance Criteria

### Phase 1: Performance
- [ ] `convertWikilinks()` only processes affected text nodes
- [ ] No noticeable lag at 1000+ characters
- [ ] Wikilink conversion still works correctly

### Phase 2: Bracket Wrapping
- [ ] Selecting text and pressing `[` wraps with `[]`
- [ ] Selecting text and pressing `(` wraps with `()`
- [ ] Selecting text and pressing `{` wraps with `{}`
- [ ] Cursor positioned after closing bracket
- [ ] No selection = normal bracket insertion
- [ ] Undo (Cmd+Z) reverts the wrap

### Phase 3: Wiki Links
- [ ] Typing `[[` inserts `[[]]` with cursor between
- [ ] Typing `[[` with selection wraps as `[[text]]`
- [ ] Wikilink still converts to button on blur/save
- [ ] Can edit wikilink by clicking into it

### Phase 4: Bold/Italic
- [ ] Cmd+B toggles bold without execCommand
- [ ] Cmd+I toggles italic without execCommand
- [ ] Works correctly with existing TurndownService conversion

## Files Changed

```
src/lib/components/NoteCard.svelte      # Main editing component
src/lib/utils/editor-shortcuts.ts       # NEW - bracket/shortcut utilities
```

## Edge Cases to Handle

1. **Nested brackets**: `[[link [inner] text]]` - only convert outer `[[]]`
2. **Escape literal brackets**: No selection = literal insertion
3. **Multi-line selection**: Bracket wrap should work across lines
4. **Empty wikilinks**: `[[]]` left empty should not break
5. **IME composition**: Ignore bracket logic during IME input

## Success Metrics

- No performance regression (maintain <5ms keystroke handling)
- Reduced code complexity (remove DOM traversal)
- Future-proof (no deprecated APIs)

## References

- Current implementation: `src/lib/components/NoteCard.svelte:200-298`
- P2-008 Todo: `todos/008-pending-p2-dom-traversal-performance.md`
- Wikilink parsing: `src/lib/utils/markdown.ts:21-43`
- TurndownService config: `NoteCard.svelte:37-58`
