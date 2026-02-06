---
status: pending
priority: p2
id: "035"
tags: [code-review, security, api]
---

# Missing try/catch for JSON Parsing in site_canvases API

## Problem Statement

The PATCH, POST, and DELETE handlers in `src/routes/api/sites/[id]/canvases/+server.ts` call `request.json()` without try/catch. Invalid JSON throws unhandled exceptions, potentially leaking stack traces.

## Findings

### From Security Review

- PATCH handler (line 154): `const updates = await request.json()` — no error handling
- POST handler (line 72): `const body = await request.json()` — no error handling
- DELETE handler (line 195): same pattern
- PATCH also lacks validation that `updates` is an array

## Proposed Solution

Wrap all `request.json()` calls in try/catch, matching the pattern used in other API routes:

```typescript
let body;
try {
    body = await request.json();
} catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
}
```

**Effort:** Small (20 min)
**Risk:** Very low

## Acceptance Criteria

- [ ] All 3 handlers have try/catch for JSON parsing
- [ ] PATCH validates `updates` is an array
- [ ] Returns 400 for invalid JSON instead of 500

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-06 | Created from hand-off review | |

## Resources

- `src/routes/api/sites/[id]/canvases/+server.ts`
