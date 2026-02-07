---
status: pending
priority: p3
id: "021"
tags: [code-review, security, data-integrity]
---

# Data Integrity: LocalStorage Data Not Validated on Load

## Problem Statement

Persisted state is loaded from localStorage and used directly without schema validation. Malformed data could cause errors or unexpected behavior.

## Findings

**Source:** Security Sentinel

**Evidence:**
- `src/lib/stores/canvas.svelte.ts` lines 32-43
- JSON parsed directly without validation
- Potential prototype pollution if `__proto__` in data

## Proposed Solutions

### Option A: Add schema validation with Zod
- **Pros:** Type-safe, runtime validation
- **Cons:** Adds dependency
- **Effort:** Medium (1-2 hours)
- **Risk:** Low

```typescript
import { z } from 'zod';

const PersistedStateSchema = z.object({
    lastViewedNoteId: z.string().nullable(),
    cameraState: z.object({
        x: z.number(),
        y: z.number(),
        zoom: z.number()
    }),
    // ...
});

function loadPersistedState(): PersistedState | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return PersistedStateSchema.parse(parsed);
        }
    } catch {
        localStorage.removeItem(STORAGE_KEY);  // Clear corrupted data
    }
    return null;
}
```

### Option B: Manual validation
- **Pros:** No new dependency
- **Cons:** More code, error-prone
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/lib/stores/canvas.svelte.ts`

## Acceptance Criteria

- [ ] Invalid localStorage data handled gracefully
- [ ] Corrupted data cleared, fresh state used
- [ ] No prototype pollution possible

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by security-sentinel agent |

## Resources

- Consider Zod for shared validation
