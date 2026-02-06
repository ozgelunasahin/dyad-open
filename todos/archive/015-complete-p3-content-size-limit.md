---
status: complete
priority: p3
issue_id: "015"
tags: [code-review, security]
dependencies: []
---

# Security: Missing Content Size Limit on API

## Problem Statement

The API accepts arbitrary content sizes without limits, making it vulnerable to resource exhaustion attacks.

## Findings

**Source:** Security Sentinel

**Evidence:**
- `src/routes/api/notes/[slug]/+server.ts` lines 30-34
- No content-length check
- No maximum size validation

## Proposed Solutions

### Option A: Add size limit check (Recommended)
- **Pros:** Simple, effective
- **Cons:** None significant
- **Effort:** Small (15 minutes)
- **Risk:** Low

```typescript
const MAX_CONTENT_SIZE = 1024 * 100; // 100KB

export const PUT: RequestHandler = async ({ params, request }) => {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_CONTENT_SIZE) {
        return json({ error: 'Content too large' }, { status: 413 });
    }

    const { content } = await request.json();
    if (typeof content !== 'string' || content.length > MAX_CONTENT_SIZE) {
        return json({ error: 'Content must be under 100KB' }, { status: 400 });
    }
    // ...
};
```

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/routes/api/notes/[slug]/+server.ts`

## Acceptance Criteria

- [ ] Large content returns 413 error
- [ ] Normal notes still save correctly

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by security-sentinel agent |

## Resources

- 100KB is a reasonable limit for markdown notes
