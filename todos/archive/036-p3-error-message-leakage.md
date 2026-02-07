---
status: pending
priority: p3
id: "036"
tags: [code-review, security, api]
---

# Supabase error.message Leaked to Client

## Problem Statement

Three locations in `src/routes/api/sites/[id]/canvases/+server.ts` return `error.message` from Supabase directly to the client (lines 131, 171, 208). This could expose internal database structure.

## Proposed Solution

Replace with generic error messages, matching the pattern used in other endpoints:

```typescript
// Before
return json({ error: error.message }, { status: 500 });
// After
return json({ error: 'Failed to update site canvases' }, { status: 500 });
```

**Effort:** Small (10 min)
**Risk:** Very low

## Acceptance Criteria

- [ ] No `error.message` from Supabase returned to client
- [ ] Generic error messages used instead

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-06 | Created from hand-off review | |
