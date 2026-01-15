---
status: pending
priority: p3
issue_id: "017"
tags: [code-review, security, authentication]
dependencies: []
---

# Logout Uses GET (CSRF Vulnerability)

## Problem Statement

Logout is implemented as a page load redirect instead of a POST action. This can cause accidental logout via link prefetching or CSRF.

## Findings

### Architecture Strategist Agent

**File**: `src/routes/logout/+page.server.ts:5-13`

```typescript
export const load: PageServerLoad = async ({ locals, cookies }) => {
    // State-changing operation in load function
    await deleteSession(locals.session.id);
    cookies.delete('session', { path: '/' });
    redirect(302, '/login');
};
```

**Issues**:
- State change (session deletion) in GET request
- Link prefetching could trigger unintended logout
- CSRF attack could log user out

## Proposed Solutions

### Option A: Convert to POST Action (Recommended)
- **Description**: Use form action for logout
- **Pros**: Proper HTTP semantics, CSRF protected
- **Cons**: Requires UI change (form instead of link)
- **Effort**: Small
- **Risk**: Low

```typescript
// +page.server.ts
export const actions: Actions = {
    default: async ({ locals, cookies }) => {
        if (locals.session) {
            await deleteSession(locals.session.id);
            cookies.delete('session', { path: '/' });
        }
        redirect(302, '/login');
    }
};
```

## Acceptance Criteria

- [ ] Logout uses POST method
- [ ] CSRF protection active
- [ ] UI updated to use form

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by architecture-strategist agent |
