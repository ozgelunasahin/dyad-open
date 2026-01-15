---
status: complete
priority: p1
issue_id: "001"
tags: [code-review, security, critical]
dependencies: []
---

# Unauthenticated Notes API

## Problem Statement

The notes API at `/api/notes/[slug]` allows **any unauthenticated user** to read and write markdown files on the server filesystem. This is a critical security vulnerability that must be fixed before deployment.

**Why it matters**: Attackers can overwrite any note content (data destruction), create arbitrary files, or inject malicious content that triggers XSS when rendered.

## Findings

### Security Sentinel Agent

**File**: `src/routes/api/notes/[slug]/+server.ts:23-47`

The PUT endpoint has no authentication check:
```typescript
export const PUT: RequestHandler = async ({ params, request }) => {
    const { slug } = params;
    // NO AUTHENTICATION CHECK
    if (!isValidSlug(slug)) {
        return json({ error: 'Invalid slug' }, { status: 400 });
    }
    // ...
    await writeFile(filePath, content, 'utf-8');  // Writes to filesystem
```

Similarly, the GET endpoint at lines 49-64 allows reading any note.

**Exploitability**: Trivial - single unauthenticated HTTP request

## Proposed Solutions

### Option A: Add Authentication Check (Recommended)
- **Description**: Add `locals.user` check to both GET and PUT handlers
- **Pros**: Simple, consistent with other protected APIs
- **Cons**: Breaks public note viewing (may be desired)
- **Effort**: Small (10 minutes)
- **Risk**: Low

```typescript
export const PUT: RequestHandler = async ({ locals, params, request }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ... rest of handler
};
```

### Option B: Canvas-Scoped Notes
- **Description**: Tie notes to canvases, only allow editing notes associated with user's canvases
- **Pros**: Fine-grained access control
- **Cons**: Major architectural change
- **Effort**: Large
- **Risk**: High

## Recommended Action

**Option A** - Add simple authentication check. Quick fix that blocks the critical vulnerability.

## Technical Details

**Affected files**:
- `src/routes/api/notes/[slug]/+server.ts`

**Testing checklist**:
- [ ] Verify unauthenticated PUT returns 401
- [ ] Verify unauthenticated GET returns 401
- [ ] Verify authenticated user can read/write notes
- [ ] Verify note editing still works in canvas UI

## Acceptance Criteria

- [ ] PUT endpoint requires authentication
- [ ] GET endpoint requires authentication
- [ ] Appropriate error responses returned for unauthorized access
- [ ] Canvas note editing functionality preserved

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by security-sentinel agent |

## Resources

- PR: feat/user-management-canvas-publishing
- Related: OWASP Authentication Cheat Sheet
