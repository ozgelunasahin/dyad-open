---
status: pending
priority: p2
issue_id: "067"
tags: [code-review, frontend-plan, architecture, phase-2]
dependencies: []
---

# Auto-Save Pattern Needs Generation Counter for Race Conditions

## Problem Statement

The auto-save code sample uses a simple debounce timer but does not guard against in-flight saves completing out of order. If save A is in flight when save B fires and B completes first, save A's response can overwrite the status indicator (showing "saved" when newer content is still saving).

## Findings

**Architecture review:** The existing codebase uses `initGeneration` counters in `canvasStore` for exactly this pattern. The prompt editor should follow suit.

## Proposed Solutions

### Add generation counter
```typescript
let saveGeneration = 0;

saveTimer = setTimeout(async () => {
    const gen = ++saveGeneration;
    saveStatus = 'saving';
    const res = await fetch(...);
    if (gen !== saveGeneration) return; // Superseded
    saveStatus = res.ok ? 'saved' : 'error';
}, 1500);
```

- **Effort:** Tiny (15 minutes)
- **Risk:** None

## Acceptance Criteria

- [ ] Auto-save uses generation counter to prevent stale responses from updating status
- [ ] Pattern matches `initGeneration` approach documented in codebase

## Resources

- Plan: `docs/plans/2026-03-25-feat-frontend-v01-core-journey-plan.md` lines 142-159
- Existing pattern: `src/lib/stores/canvas.svelte.ts` `initGeneration`
