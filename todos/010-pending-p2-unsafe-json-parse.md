---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, typescript, type-safety]
dependencies: []
---

# Unsafe JSON.parse Without Validation

## Problem Statement

Multiple places use `JSON.parse()` without runtime validation that the parsed value conforms to the expected type. This can cause runtime errors with corrupted localStorage or API responses.

## Findings

### TypeScript Reviewer Agent

**File**: `src/lib/stores/canvas.svelte.ts:38-46`
```typescript
function loadPersistedState(canvasId: string | null): PersistedState | null {
    try {
        const stored = localStorage.getItem(getStorageKey(canvasId));
        if (stored) {
            return JSON.parse(stored); // Returns `any` - no validation
        }
    } catch {
        // Ignore parse errors
    }
    return null;
}
```

**Also affected**:
- Vault JSON fetch in `+page.svelte`
- API response parsing in `NoteCard.svelte`

## Proposed Solutions

### Option A: Add Type Guards
- **Description**: Create type guard functions to validate parsed JSON
- **Pros**: No external dependencies
- **Cons**: Manual validation code
- **Effort**: Medium
- **Risk**: Low

### Option B: Use Zod (Recommended)
- **Description**: Schema validation library for runtime type checking
- **Pros**: Automatic TypeScript types, comprehensive validation
- **Cons**: Adds dependency
- **Effort**: Medium
- **Risk**: Low

## Recommended Action

**Option B** - Use Zod for consistent validation across the codebase.

## Acceptance Criteria

- [ ] localStorage parsing validates against schema
- [ ] Vault JSON parsing validates against schema
- [ ] API responses validated before use
- [ ] TypeScript types derived from Zod schemas

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by kieran-typescript-reviewer agent |
