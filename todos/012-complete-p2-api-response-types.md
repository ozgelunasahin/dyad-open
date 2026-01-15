---
status: complete
priority: p2
issue_id: "012"
tags: [code-review, typescript]
dependencies: []
---

# TypeScript: Missing API Response Type Definitions

## Problem Statement

API responses are ad-hoc with no shared type definitions. `res.json()` returns `Promise<any>`, making client-side typing difficult and error-prone.

## Findings

**Source:** TypeScript Reviewer

**Evidence:**
- `src/routes/api/notes/[slug]/+server.ts` lines 35, 38, 49: Different response shapes
- `src/lib/components/NoteCard.svelte` lines 59-61: Untyped `data.content` access

## Proposed Solutions

### Option A: Create shared API types (Recommended)
- **Pros:** Type safety, reusability, better DX
- **Cons:** More files to maintain
- **Effort:** Small (1 hour)
- **Risk:** Low

```typescript
// src/lib/types/api.ts
export interface NoteGetResponse {
    content: string;
}

export interface NotePutResponse {
    success: true;
    saved: string;
}

export interface ApiError {
    error: string;
}

// In +server.ts
return json({ success: true, saved: new Date().toISOString() } satisfies NotePutResponse);

// In NoteCard.svelte
const data = await res.json() as NoteGetResponse;
```

### Option B: Runtime validation with Zod
- **Pros:** Runtime safety, auto-generated types
- **Cons:** Adds dependency
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/routes/api/notes/[slug]/+server.ts`
- `src/lib/components/NoteCard.svelte`
- New: `src/lib/types/api.ts`

### Components
- Notes API
- NoteCard

## Acceptance Criteria

- [ ] All API responses have defined types
- [ ] Client code uses proper typing
- [ ] No `any` types from API calls

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by kieran-typescript-reviewer agent |

## Resources

- Consider using `satisfies` for response objects
