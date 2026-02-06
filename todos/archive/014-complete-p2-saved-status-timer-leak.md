---
status: complete
priority: p2
issue_id: "014"
tags: [code-review, race-condition, memory-leak]
dependencies: []
---

# Memory Leak: "Saved" Status Timer Not Tracked

## Problem Statement

The `setTimeout` that resets "Saved" to "idle" is not tracked or cancelled. If multiple saves happen rapidly, multiple timers stack up. If component unmounts, timer fires on detached component.

## Findings

**Source:** Julik Frontend Races Reviewer

**Evidence:**
- `src/lib/components/NoteCard.svelte` lines 306-310

```typescript
if (res.ok) {
    saveStatus = 'saved';
    setTimeout(() => {
        if (saveStatus === 'saved') saveStatus = 'idle';
    }, 2000);
}
```

**Sequence:**
1. Save A completes, schedules timeout (2s)
2. 500ms later, save B starts, sets 'saving'
3. Save B completes, schedules ANOTHER timeout
4. Original timeout fires, sets 'idle' prematurely

## Proposed Solutions

### Option A: Track and clear timer (Recommended)
- **Pros:** Proper cleanup, single timer
- **Cons:** More state
- **Effort:** Small (15 minutes)
- **Risk:** Low

```typescript
let savedStatusTimer: ReturnType<typeof setTimeout>;

// In cleanup effect
$effect(() => {
    return () => {
        clearTimeout(debounceTimer);
        clearTimeout(savedStatusTimer);
    };
});

// In saveNow()
clearTimeout(savedStatusTimer);
if (res.ok) {
    saveStatus = 'saved';
    savedStatusTimer = setTimeout(() => {
        if (saveStatus === 'saved') saveStatus = 'idle';
    }, 2000);
}
```

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/lib/components/NoteCard.svelte`

### Components
- NoteCard save status

## Acceptance Criteria

- [ ] Only one "saved -> idle" timer active at a time
- [ ] Timer cancelled on component unmount
- [ ] Rapid saves don't cause state confusion

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by julik-frontend-races-reviewer agent |

## Resources

- Test by saving rapidly and watching status indicator
