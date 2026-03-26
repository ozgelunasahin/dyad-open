---
status: pending
priority: p2
issue_id: "068"
tags: [code-review, frontend-plan, agent-native, api]
dependencies: []
---

# Agent-Native API Gaps: Discover, Gate Check, Invitations

## Problem Statement

Seven user-facing capabilities in the plan have no API endpoint, blocking agents from completing the full user journey. The three most critical gaps:

1. **No discover feed API** — Data loads only via `+page.server.ts`. Agents cannot browse published prompts.
2. **No feedback gate check API** — Gate is embedded in `hooks.server.ts` middleware. Agents can only discover they're gated by getting 403 errors.
3. **No invitation listing/detail** — Only `getPendingForPrompt` exists. No way to list all received invitations or inspect a specific invitation.

## Findings

**Agent-native review:** 18/25 user-facing capabilities have API endpoints (72%). The core CRUD operations are solid, but discovery and invitation management paths have gaps.

Additional gaps (lower priority):
4. No comment deletion endpoint
5. No anonymous prompt listing API (landing page data)
6. No location search API (covered separately in todo #065)

## Proposed Solutions

### Add three API endpoints
1. `GET /api/prompts/discover?region=berlin` — Calls `getPublishedPrompts()`, returns `PromptSummary[]`
2. `GET /api/gate` — Calls `checkGate()`, returns `{ gated, feedbackFormId }`
3. `GET /api/invitations?role=inviter|invitee&state=pending` + `GET /api/invitations/[id]`

Each is a thin wrapper around existing service methods.

- **Effort:** Small-Medium (2-3 hours for all three)
- **Risk:** Low — wrapping existing tested services

## Acceptance Criteria

- [ ] `GET /api/prompts/discover` returns published prompts for authenticated users
- [ ] `GET /api/gate` returns gate status without triggering a redirect
- [ ] `GET /api/invitations` lists user's invitations with role/state filtering
- [ ] `GET /api/invitations/[id]` returns invitation details for participants only
- [ ] All endpoints require auth and follow existing API patterns

## Resources

- Agent-native review findings
- Existing services: `src/lib/services/prompt-query.ts`, `src/lib/services/gate.ts`, `src/lib/services/invitation.ts`
