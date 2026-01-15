---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, architecture, data-integrity]
dependencies: []
---

# Architecture: Vault State Mutation Without Persistence Sync

## Problem Statement

When creating new notes via `addNoteToVault()`, the vault is mutated in-memory but not synchronized with `static/vault/index.json`. On page reload, new notes appear as broken links.

## Findings

**Source:** Architecture Strategist

**Evidence:**
- `src/lib/stores/canvas.svelte.ts` lines 265-283
- In-memory vault mutation at line 278
- No corresponding update to vault index file
- Markdown file is created, but index doesn't know about it

**Impact:**
- New notes work during session
- After reload, they appear as broken links
- Requires vault rebuild to fix

## Proposed Solutions

### Option A: API endpoint to update vault index
- **Pros:** Server handles index management
- **Cons:** More API surface
- **Effort:** Medium (2-3 hours)
- **Risk:** Low

```typescript
// New endpoint: POST /api/vault/update
// Or extend PUT /api/notes/[slug] to also update vault index
```

### Option B: File watcher with index regeneration
- **Pros:** Automatic sync
- **Cons:** More infrastructure
- **Effort:** Large
- **Risk:** Medium

### Option C: Document limitation
- **Pros:** No code changes
- **Cons:** Poor UX
- **Effort:** None
- **Risk:** Low

Add warning: "New notes require page reload/rebuild to appear in index"

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/lib/stores/canvas.svelte.ts`
- `src/routes/api/notes/[slug]/+server.ts`
- `static/vault/index.json`

### Components
- Canvas store
- Notes API
- Vault system

## Acceptance Criteria

- [ ] New notes persist across page reloads
- [ ] Vault index updated when notes created
- [ ] No broken links for newly created notes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by architecture-strategist agent |

## Resources

- Consider how vault index is generated initially
