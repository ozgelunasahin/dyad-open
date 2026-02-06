---
status: pending
priority: p2
id: "003"
tags: [code-review, security, authentication]
---

# Security: No Authentication on File Write API

## Problem Statement

The PUT endpoint allows unauthenticated writes to markdown files. Anyone who can reach this endpoint can create or overwrite notes.

## Findings

**Source:** Security Sentinel

**Evidence:**
- `src/routes/api/notes/[slug]/+server.ts` lines 23-47
- No authentication check before file write
- Combined with XSS vulnerability, enables remote stored XSS

**Impact:**
- Content defacement
- Injection of malicious content
- Denial of service through content flooding

## Proposed Solutions

### Option A: Add authentication middleware (Recommended)
- **Pros:** Proper access control
- **Cons:** Requires auth system setup
- **Effort:** Medium (depends on existing auth)
- **Risk:** Low

```typescript
import { error } from '@sveltejs/kit';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
    if (!locals.user || !locals.user.canEdit) {
        throw error(401, 'Unauthorized');
    }
    // ... rest of handler
};
```

### Option B: Add API key/token
- **Pros:** Simpler than full auth
- **Cons:** Less secure, harder to manage
- **Effort:** Small
- **Risk:** Medium

### Option C: Accept risk (local-only)
- **Pros:** No changes needed
- **Cons:** Insecure if exposed to network
- **Effort:** None
- **Risk:** High if deployed publicly

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/routes/api/notes/[slug]/+server.ts`
- `src/hooks.server.ts` (may need to create)

### Components
- Notes API
- Authentication system

## Acceptance Criteria

- [ ] Unauthenticated requests return 401
- [ ] Authenticated requests work correctly
- [ ] Auth check added to both GET and PUT

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by security-sentinel agent |

## Resources

- This may be acceptable for local-only development
- Should be addressed before any public deployment
