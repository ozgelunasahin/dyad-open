# Plan: Fix Wikilink Creation

## Problem Statement

1. **Broken auto-completion**: The `[[` auto-completion pre-inserts `]]`, but the input rule only fires when the user *types* `]]`. Result: typing inside pre-inserted brackets doesn't create a wikilink.

2. **Keyboard accessibility**: User feedback indicates some keyboards don't have easy access to `[`. These users cannot create links at all.

3. **Copy-paste doesn't work**: Related to input rule - pasting `[[target]]` doesn't trigger the rule since it fires on keystroke, not paste.

## Current Implementation

```
wikilink.ts:
├── Input Rule: /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/
│   └── Fires when user TYPES closing ]]
├── Keyboard Shortcut '[':
│   ├── If text selected → wrap in wikilink (works)
│   └── If after '[' → was inserting '[]]' (broken)
└── Command: setWikilink({ target, display })
    └── Programmatically creates wikilink (works)
```

## Proposed Solution

### 1. Remove broken auto-completion
- Delete the `[[` → `[[]]` auto-completion code
- It conflicts with the input rule design

### 2. Keep what works
- **Input rule**: User types `[[target]]` → wikilink created
- **Selection wrap**: Select text, press `[` → wikilink created
- **Programmatic**: `setWikilink` command

### 3. Add `Cmd/Ctrl+K` keyboard shortcut for accessibility

This is the **industry-standard** link creation shortcut used by:
- Google Docs
- Notion
- Obsidian
- Craft
- Most text editors

Users with limited keyboard access can use this universal shortcut instead of `[[`.

## Implementation Details

### Files to modify:
- `src/lib/tiptap/wikilink.ts` - Add `Mod-k` keyboard shortcut

### Implementation (minimal, ~5 lines):

```typescript
// In wikilink.ts addKeyboardShortcuts()
'Mod-k': ({ editor }) => {
  const { selection } = editor.state;
  const selectedText = selection.empty
    ? ''
    : editor.state.doc.textBetween(selection.from, selection.to);

  const target = window.prompt('Link to:', selectedText);
  if (target?.trim()) {
    if (!selection.empty) {
      editor.chain().deleteSelection().run();
    }
    editor.commands.setWikilink({
      target: target.trim(),
      display: selectedText || undefined
    });
  }
  return true;
}
```

### Why `Cmd+K` over `/link` slash command:

| Aspect | `Cmd+K` | `/link` slash command |
|--------|---------|----------------------|
| New files | 0 | 2 (extension + UI component) |
| New dependencies | 0 | 1 (`@tiptap/suggestion`) |
| Lines of code | ~10 | ~100+ |
| Discoverability | High (universal standard) | Medium (must learn) |
| Speed | 1 keystroke | 5+ keystrokes |

## Alternative Considered: Slash command `/link`

Could use Tiptap's Suggestion extension to create a `/link` command. However:
- Requires new dependency (`@tiptap/suggestion`)
- Requires 2 new files (extension + Svelte popup component)
- Suggestion utility is designed for multi-item autocomplete menus, not single actions
- Over-engineering for a single use case
- `/link` requires 5+ keystrokes vs 1 for `Cmd+K`

**Verdict**: Save slash commands for when we need a full command palette with multiple options.

## Future Enhancements (out of scope)

### Fix auto-completion (investigate)
The broken `[[` → `[[]]` auto-completion could potentially be fixed with:
- ProseMirror plugin watching for `[[` pattern
- "Pending wikilink" state that converts when user exits brackets
- Transaction handler instead of input rule

This would restore the Obsidian/Roam-like UX where brackets auto-complete. Worth investigating but not blocking.

### Additional features
- Note title autocomplete dropdown when creating links
- Handle paste of `[[target]]` pattern
- Slash command menu (if more commands needed)

## Test Plan

1. [ ] Type `[[target]]` manually → wikilink created
2. [ ] Select text, press `[` → wikilink created
3. [ ] Press `Cmd/Ctrl+K` with no selection → prompt appears, enter target → wikilink created
4. [ ] Select text, press `Cmd/Ctrl+K` → prompt pre-filled with selection → wikilink created with display text
5. [ ] Press `Cmd/Ctrl+K`, cancel prompt → no wikilink created
6. [ ] Copy-paste `[[target]]` → should NOT create wikilink (expected - input rules are keystroke-based)

## Summary

| Before | After |
|--------|-------|
| `[[` auto-completion broken | Removed (conflicts with input rule) |
| No keyboard accessibility | `Cmd/Ctrl+K` shortcut (universal standard) |
| Input rule works | Input rule works (unchanged) |
| Selection wrap works | Selection wrap works (unchanged) |
