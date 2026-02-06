---
status: complete
priority: p2
issue_id: "010"
tags: [code-review, quality, duplication]
dependencies: []
---

# Code Quality: Duplicate Markdown Loading Logic

## Problem Statement

Both `enterEditMode()` and `loadOriginalMarkdown()` fetch the same markdown content. The `$effect` calls `loadOriginalMarkdown()` when entering edit mode, but `enterEditMode()` also loads it, causing duplicate network requests.

## Findings

**Source:** Pattern Recognition Specialist, Code Simplicity Reviewer

**Evidence:**
- `src/lib/components/NoteCard.svelte` lines 53-75: `enterEditMode()` fetches markdown
- `src/lib/components/NoteCard.svelte` lines 367-379: `loadOriginalMarkdown()` fetches same data
- `$effect` at lines 354-365 calls `loadOriginalMarkdown()` on edit entry

**Impact:**
- Duplicate network requests
- Wasted bandwidth
- Potential race condition if they return different data

## Proposed Solutions

### Option A: Remove loading from enterEditMode (Recommended)
- **Pros:** Single source of truth
- **Cons:** Relies on $effect
- **Effort:** Small (15 minutes)
- **Risk:** Low

```typescript
async function enterEditMode() {
    if (canvasStore.editingCardId && canvasStore.editingCardId !== card.id) {
        canvasStore.exitEditMode();
    }
    canvasStore.enterEditMode(card.id);
    // Let $effect handle loading via loadOriginalMarkdown()
    await tick();
    contentEl?.focus();
}
```

### Option B: Remove $effect, keep explicit loading
- **Pros:** Explicit control
- **Cons:** May miss edge cases
- **Effort:** Small
- **Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/lib/components/NoteCard.svelte`

### Components
- NoteCard edit mode

## Acceptance Criteria

- [ ] Only one network request when entering edit mode
- [ ] Frontmatter preserved correctly
- [ ] All edit entry paths work (double-click, 'e' key)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by pattern-recognition-specialist agent |

## Resources

- Also see duplicate frontmatter fallback strings (4 occurrences)
