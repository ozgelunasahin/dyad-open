---
status: complete
priority: p1
issue_id: "005"
tags: [code-review, security, typescript]
dependencies: []
---

# Security: Untyped API Request Body Parsing

## Problem Statement

The API endpoint parses `request.json()` without proper validation. If the body is null, array, or primitive instead of an object with `content`, the destructuring will fail or behave unexpectedly.

## Findings

**Source:** TypeScript Reviewer, Security Sentinel

**Evidence:**
- `src/routes/api/notes/[slug]/+server.ts` lines 23-34
- `request.json()` returns `Promise<any>`
- Destructuring assumes body is an object
- No try/catch for malformed JSON

**Attack Vector:**
```bash
# Send array instead of object
curl -X PUT -d '[]' /api/notes/test
# Send null
curl -X PUT -d 'null' /api/notes/test
```

## Proposed Solutions

### Option A: Full validation with type guards (Recommended)
- **Pros:** Type-safe, handles all edge cases
- **Cons:** More verbose
- **Effort:** Small (1 hour)
- **Risk:** Low

```typescript
interface PutNoteBody {
    content: string;
}

function isValidBody(body: unknown): body is PutNoteBody {
    return typeof body === 'object' &&
           body !== null &&
           'content' in body &&
           typeof (body as PutNoteBody).content === 'string';
}

export const PUT: RequestHandler = async ({ params, request }) => {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!isValidBody(body)) {
        return json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { content } = body;
    // ... rest of handler
};
```

### Option B: Use Zod schema validation
- **Pros:** Declarative, reusable
- **Cons:** Adds dependency
- **Effort:** Small
- **Risk:** Low

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/routes/api/notes/[slug]/+server.ts`

### Components
- Notes API endpoint

## Acceptance Criteria

- [ ] Invalid JSON returns 400 with clear error
- [ ] Malformed body (array, null, missing content) returns 400
- [ ] Valid requests still work correctly
- [ ] Type safety throughout handler

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by kieran-typescript-reviewer agent |

## Resources

- Consider creating shared API types in `$lib/types/api.ts`
