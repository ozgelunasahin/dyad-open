---
status: pending
priority: p2
id: "010"
tags: [code-review, architecture, api]
---

# Inconsistent API Response Patterns

## Problem Statement

API endpoints use three different error response patterns, making client-side error handling inconsistent and unpredictable.

## Findings

### Architecture Strategist & Agent-Native Reviewer Agents

**Pattern 1 - Return JSON** (positions/+server.ts:8):
```typescript
return json({ error: 'Unauthorized' }, { status: 401 });
```

**Pattern 2 - Throw error()** (positions/+server.ts:13):
```typescript
error(404, 'Canvas not found');
```

**Pattern 3 - Return fail()** (dashboard/+page.server.ts):
```typescript
return fail(400, { error: 'Invalid canvas name' });
```

**Impact**: Clients must handle multiple error formats. Machine-parseable error handling is difficult.

## Proposed Solutions

### Option A: Standardize on JSON Responses (Recommended)
- **Description**: All API endpoints return consistent JSON errors
- **Pros**: Predictable for clients and agents
- **Cons**: Need to update all endpoints
- **Effort**: Medium
- **Risk**: Low

Standard format:
```json
{
    "error": {
        "code": "UNAUTHORIZED",
        "message": "Authentication required"
    }
}
```

## Recommended Action

**Option A** - Standardize error format. Create helper function for consistent errors.

## Acceptance Criteria

- [ ] All API endpoints use same error response format
- [ ] Error codes are machine-parseable
- [ ] HTTP status codes used correctly
- [ ] Client code updated for new format

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by architecture and agent-native agents |
