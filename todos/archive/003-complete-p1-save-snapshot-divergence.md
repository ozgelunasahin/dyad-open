---
status: complete
priority: p1
issue_id: "003"
tags: [code-review, race-condition, data-loss]
dependencies: []
---

# Race Condition: Save Snapshot Divergence Causes Silent Data Loss

## Problem Statement

When `saveNow()` takes a DOM snapshot and the save completes, the user sees "Saved" even though they may have continued typing. The displayed content differs from saved content, leading to silent data loss.

## Findings

**Source:** Julik Frontend Races Reviewer

**Evidence:**
- `src/lib/components/NoteCard.svelte` lines 285-317
- Snapshot taken at line 291: `const htmlContent = contentEl.innerHTML`
- Save completes 200-500ms later
- User may type during this window
- "Saved" badge appears, deceiving user

**Sequence:**
1. User types, debounce fires
2. `saveNow()` takes innerHTML snapshot
3. User continues typing (content changes)
4. PUT request completes
5. "Saved" appears - but latest content is NOT saved
6. User closes browser, loses recent edits

## Proposed Solutions

### Option A: Generation counter (Recommended)
- **Pros:** Accurately tracks if content changed during save
- **Cons:** Slightly more complex
- **Effort:** Small (1 hour)
- **Risk:** Low

```typescript
let saveGeneration = 0;

async function saveNow() {
    const currentGeneration = ++saveGeneration;
    const htmlContent = contentEl.innerHTML;

    // ... save logic ...

    if (res.ok) {
        if (saveGeneration === currentGeneration) {
            saveStatus = 'saved';
        } else {
            // Content changed during save - re-save
            scheduleSave();
        }
    }
}
```

### Option B: Compare content after save
- **Pros:** Direct comparison
- **Cons:** More expensive (two conversions)
- **Effort:** Small
- **Risk:** Low

### Option C: Block input during save
- **Pros:** Simple, prevents the issue entirely
- **Cons:** Bad UX, interrupts typing flow
- **Effort:** Small
- **Risk:** Medium (UX impact)

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/lib/components/NoteCard.svelte`

### Components
- NoteCard save mechanism

## Acceptance Criteria

- [ ] "Saved" only shown when displayed content matches saved content
- [ ] If content changes during save, new save is scheduled
- [ ] Test with slow network (3G throttling)
- [ ] No data loss when typing rapidly during saves

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by julik-frontend-races-reviewer agent |

## Resources

- Test by adding breakpoint after fetch completes, type during pause
