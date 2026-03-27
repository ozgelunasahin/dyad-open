---
status: pending
priority: p2
issue_id: "075"
tags: [architecture, service-layer, code-quality]
dependencies: []
---

# Service Layer Bypasses — Direct Supabase Queries in Route Handlers

## Problem Statement

Several route handlers bypass the service layer and query Supabase directly. This breaks the portability pattern documented in `docs/solutions/architecture/service-layer-and-test-portability-patterns.md`.

## Instances

1. **Profile page** (`src/routes/(app)/profile/+page.server.ts`) — queries `prompt_invitations` directly to load sent invitations. Needs `InvitationService.getMySentInvitations(userId)` method.

2. **GET /api/feedback/[id]** (`src/routes/api/feedback/[id]/+server.ts`) — queries `feedback_forms` directly instead of using `FeedbackService.getFormById()`.

3. **POST /api/prompts/[id]/invitations** (`src/routes/api/prompts/[id]/invitations/+server.ts`) — validates `commentId` ownership via direct query.

4. **(app) layout** (`src/routes/(app)/+layout.server.ts`) — queries `profiles` directly for username. No `ProfileService` exists yet.

## Proposed Solution

Add missing service methods and replace direct queries:
- `InvitationService.getMySentInvitations(userId)`
- `FeedbackService.getFormById(formId, userId)` (already exists, just wire it)
- `ProfileService.getUsername(userId)` (new service)

## Acceptance Criteria

- [ ] Zero `locals.supabase.from()` calls in route handlers (only in service implementations)
