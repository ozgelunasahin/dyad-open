---
status: pending
priority: p2
issue_id: "073"
tags: [architecture, copy, i18n, developer-experience]
dependencies: []
---

# Extract User-Facing Copy Into a Central File

## Problem Statement

User-facing copy is hardcoded inline in Svelte components. Iterating on language (e.g., changing "prompt" to "conversation") requires editing 18 instances across 6 files. This should be a single-file change.

## Proposed Solutions

### Option A: Central copy object (Recommended for v0.1)
Create `src/lib/copy.ts` with all user-facing strings as a typed object. Components import from it.

```typescript
export const copy = {
  discover: {
    empty: 'No conversations available right now.',
    startNew: 'Start a conversation',
    filterEmpty: 'No conversations match your filters.',
  },
  profile: {
    heading: 'My conversations',
    // ...
  }
} as const;
```

- **Pros:** Simple, type-safe, single source of truth, easy to grep
- **Cons:** Not a full i18n solution
- **Effort:** Small (1-2 hours)

### Option B: Full i18n library (e.g., svelte-i18n)
- **Pros:** Supports multiple languages, pluralisation, interpolation
- **Cons:** Overkill for a single-language v0.1
- **Effort:** Medium

## Acceptance Criteria

- [ ] All user-facing strings imported from a central module
- [ ] Changing a word in the copy file updates it everywhere
