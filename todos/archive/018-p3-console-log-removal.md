---
status: pending
priority: p3
id: "018"
tags: [code-review, code-quality]
---

# Console Logging in Production Code

## Problem Statement

13 instances of `console.error` and 1 instance of `console.log` exist in production code. Some log on every operation (e.g., path computation).

## Findings

### Pattern Recognition Agent

**Locations**:
- `src/lib/components/Canvas.svelte:354,391`
- `src/hooks.server.ts:26`
- `src/lib/components/NoteCard.svelte:137,151`
- `src/routes/api/notes/[slug]/+server.ts:44`
- `src/routes/register/+page.server.ts:66`
- `src/lib/stores/canvas.svelte.ts:280`
- `src/routes/api/canvases/[canvasId]/positions/+server.ts:70`
- `src/routes/dashboard/+page.server.ts:50,72`
- `src/routes/login/+page.server.ts:58`
- `src/routes/canvas/[canvasId]/+page.svelte:57`

## Proposed Solutions

### Option A: Use Logging Library
- **Description**: Use pino or similar with log levels
- **Pros**: Production-ready logging, configurable
- **Cons**: Adds dependency
- **Effort**: Medium
- **Risk**: Low

### Option B: Remove Debug Logs (Recommended for now)
- **Description**: Remove unnecessary logs, keep error logs server-side only
- **Pros**: No dependency, quick
- **Cons**: Less visibility
- **Effort**: Small
- **Risk**: Low

## Acceptance Criteria

- [ ] No `console.log` in production code
- [ ] Error logs only on server-side where appropriate
- [ ] No logging in hot paths (path computation)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by pattern-recognition-specialist agent |
