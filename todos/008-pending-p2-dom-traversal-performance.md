---
status: complete
priority: p2
issue_id: "008"
tags: [code-review, performance]
dependencies: []
---

# Performance: convertWikilinks() DOM Traversal on Every Keystroke

## Problem Statement

The `convertWikilinks()` function is called on every keystroke via `handleInput()`. It uses TreeWalker to traverse the entire DOM subtree each time, causing UI jank in longer documents.

## Findings

**Source:** Performance Oracle

**Evidence:**
- `src/lib/components/NoteCard.svelte` lines 220-276
- Called from `handleInput()` on every input event
- O(n) traversal per keystroke where n = number of text nodes
- DOM manipulation triggers synchronous layout/reflow

**Impact:** Measurable lag after ~500 characters

## Proposed Solutions

### Option A: Debounce wikilink conversion (Recommended)
- **Pros:** Simple, preserves functionality
- **Cons:** Brief delay before wikilinks appear
- **Effort:** Small (30 minutes)
- **Risk:** Low

```typescript
let wikilinkConversionTimer: ReturnType<typeof setTimeout> | null = null;

function handleInput() {
    // Debounce wikilink conversion separately from save
    if (wikilinkConversionTimer) clearTimeout(wikilinkConversionTimer);
    wikilinkConversionTimer = setTimeout(convertWikilinks, 300);

    // Save scheduling remains separate
    scheduleSave();
}
```

### Option B: Use MutationObserver
- **Pros:** Only processes changed nodes
- **Cons:** More complex setup
- **Effort:** Medium
- **Risk:** Low

### Option C: Convert on save only
- **Pros:** Maximum performance
- **Cons:** Wikilinks don't appear until save
- **Effort:** Small
- **Risk:** Medium (UX impact)

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/lib/components/NoteCard.svelte`

### Components
- NoteCard editor

## Acceptance Criteria

- [ ] No lag when typing in documents with 1000+ characters
- [ ] Wikilinks still convert correctly
- [ ] Debounce timer cleaned up on unmount

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by performance-oracle agent |
| 2026-01-15 | Fixed | Debounced convertWikilinks with 300ms timer |

## Resources

- Test by typing rapidly in a long document
