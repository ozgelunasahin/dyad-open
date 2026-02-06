---
status: complete
priority: p1
issue_id: "002"
tags: [code-review, security, critical, authorization]
dependencies: []
---

# Missing Authorization on Canvas Deletion

## Problem Statement

The canvas deletion action in the dashboard does not verify canvas ownership before deletion. Any authenticated user can delete ANY canvas by knowing or guessing its ID.

**Why it matters**: This is an IDOR (Insecure Direct Object Reference) vulnerability that allows data destruction across user boundaries.

## Findings

### Security Sentinel & Data Integrity Agents

**File**: `src/routes/dashboard/+page.server.ts:57-77`

```typescript
delete: async ({ request, locals }) => {
    if (!locals.user) {
        redirect(302, '/login');
    }

    const data = await request.formData();
    const canvasId = data.get('canvasId');

    // NO OWNERSHIP CHECK!
    try {
        await deleteCanvas(canvasId);  // Direct deletion without authorization
```

**Attack Vector**:
1. Attacker registers an account
2. Attacker enumerates or guesses canvas IDs (nanoid is 21 chars but predictable patterns may exist)
3. Attacker submits delete request for victim's canvas
4. Canvas and all card positions are permanently deleted

## Proposed Solutions

### Option A: Add Ownership Check (Recommended)
- **Description**: Fetch canvas and verify ownership before deletion
- **Pros**: Simple, mirrors pattern used elsewhere
- **Cons**: One extra database query
- **Effort**: Small (10 minutes)
- **Risk**: Low

```typescript
delete: async ({ request, locals }) => {
    if (!locals.user) {
        redirect(302, '/login');
    }

    const canvasId = data.get('canvasId');

    const canvas = await getCanvasById(canvasId);
    if (!canvas || canvas.userId !== locals.user.id) {
        return fail(403, { error: 'Access denied' });
    }

    await deleteCanvas(canvasId);
```

### Option B: Move Check to Operations Layer
- **Description**: Modify `deleteCanvas` to accept userId and verify internally
- **Pros**: Centralizes authorization logic
- **Cons**: Changes function signature, affects all callers
- **Effort**: Medium
- **Risk**: Low

## Recommended Action

**Option A** - Add ownership check in the action handler. Pattern is consistent with canvas update actions.

## Technical Details

**Affected files**:
- `src/routes/dashboard/+page.server.ts`

**Testing checklist**:
- [ ] Own canvases can be deleted
- [ ] Other users' canvases cannot be deleted
- [ ] 403 returned for unauthorized deletion attempt

## Acceptance Criteria

- [ ] Canvas deletion verifies ownership
- [ ] Unauthorized deletion attempts return 403
- [ ] No regression in authorized deletion flow

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by security-sentinel and data-integrity agents |

## Resources

- PR: feat/user-management-canvas-publishing
- Related: OWASP IDOR Prevention
