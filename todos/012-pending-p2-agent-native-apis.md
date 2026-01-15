---
status: pending
priority: p2
issue_id: "012"
tags: [code-review, architecture, api, agent-native]
dependencies: []
---

# Missing REST APIs for Agent Accessibility

## Problem Statement

The branch implements most functionality through SvelteKit form actions rather than REST APIs. Agents cannot programmatically manage canvases, authentication, or publishing.

**Agent-Native Score**: 4/16 capabilities accessible (25%)

## Findings

### Agent-Native Reviewer Agent

**Missing APIs**:
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Create user account |
| `/api/auth/login` | POST | Authenticate, get session |
| `/api/auth/logout` | POST | Invalidate session |
| `/api/auth/me` | GET | Get current user info |
| `/api/canvases` | GET | List user's canvases |
| `/api/canvases` | POST | Create new canvas |
| `/api/canvases/{id}` | GET | Get canvas details |
| `/api/canvases/{id}` | PATCH | Update canvas settings |
| `/api/canvases/{id}` | DELETE | Delete canvas |
| `/api/public/{username}/{slug}` | GET | Get published canvas |
| `/api/notes` | GET | List all notes |
| `/api/notes/{slug}` | DELETE | Delete a note |

**What works for agents**:
- `GET/PUT /api/notes/{slug}` - Note content
- `GET/PUT /api/canvases/{id}/positions` - Card positions

## Proposed Solutions

### Option A: Add Parallel REST APIs
- **Description**: Create REST endpoints mirroring form actions
- **Pros**: Full agent accessibility, backward compatible
- **Cons**: Some code duplication with form actions
- **Effort**: Large
- **Risk**: Low

### Option B: Convert Form Actions to APIs
- **Description**: Replace form actions with API calls from frontend
- **Pros**: Single implementation, consistent
- **Cons**: Breaking change, requires frontend updates
- **Effort**: Large
- **Risk**: Medium

## Recommended Action

**Option A** - Add REST APIs incrementally. Start with auth and canvas CRUD.

## Acceptance Criteria

- [ ] Auth endpoints exist (register, login, logout, me)
- [ ] Canvas CRUD endpoints exist
- [ ] Public canvas endpoint exists
- [ ] All endpoints documented

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by agent-native-reviewer agent |
