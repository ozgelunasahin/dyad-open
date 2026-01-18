---
status: pending
priority: p1
issue_id: "034"
tags: [code-review, bug, canvas-improvements]
dependencies: []
---

# String-Based Key Matching Can Match Wrong Cards

## Problem Statement

The `unopenCard()` method uses `key.includes(cardId)` to clean up stored paths and hidden chains. This is dangerous - if cards have IDs like `note` and `note-123`, closing `note` will also match and delete keys for `note-123`.

## Findings

**From TypeScript Reviewer (canvas.svelte.ts:1141-1143, 1159-1161):**
```typescript
// Dangerous pattern
for (const [key] of this.storedPaths) {
    if (key.includes(cardId)) {  // Could match partial IDs!
        keysToDelete.push(key);
    }
}
```

**Impact:** Closing a card with a short ID could accidentally delete paths/chains for unrelated cards whose IDs contain that substring.

## Proposed Solutions

### Option A: Exact Key Parsing (Recommended)
Parse the key format and check exact matches.

```typescript
for (const [key] of this.storedPaths) {
    // Keys are formatted as "fromCardId-toCardId"
    const [fromId, toId] = key.split('-');
    if (fromId === cardId || toId === cardId) {
        keysToDelete.push(key);
    }
}
```

**Pros:** Precise matching
**Cons:** Assumes key format won't change
**Effort:** Small (30 min)
**Risk:** Low

### Option B: Change Key Format
Use a delimiter that can't appear in card IDs (e.g., `|` or `::`)

**Pros:** Cleaner parsing
**Cons:** Requires migration of existing data
**Effort:** Medium
**Risk:** Medium

## Technical Details

**Files to modify:**
- `src/lib/stores/canvas.svelte.ts`
  - Line 1141-1152: storedPaths cleanup in `unopenCard()`
  - Line 1159-1171: hiddenChains cleanup in `unopenCard()`

**Note:** Card IDs come from sanitized slugs which only contain `[a-z0-9-]`, so the first `-` in a key is the delimiter IF we control key generation. Verify this assumption.

## Acceptance Criteria

- [ ] Closing card "note" does not affect card "note-123"
- [ ] Closing card "a-b" correctly cleans up its paths
- [ ] All existing tests pass
- [ ] Manual test: create notes with substring relationships, verify cleanup

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-18 | Created from code review | |

## Resources

- PR Branch: feat/canvas-improvements
