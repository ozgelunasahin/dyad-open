---
status: pending
priority: p2
issue_id: "069"
tags: [code-review, frontend-plan, architecture, phase-3]
dependencies: []
---

# FeedbackService Missing getFormById + Reuse FeedbackModal Logic

## Problem Statement

Two related issues:

1. **Service layer bypass:** `GET /api/feedback/[id]` queries `locals.supabase.from('feedback_forms')` directly, bypassing the `FeedbackService` interface. This violates the service-layer pattern documented in `docs/solutions/architecture/service-layer-and-test-portability-patterns.md`.

2. **Component reuse:** The plan describes building the feedback page from scratch, but `FeedbackModal.svelte` already implements the core interaction pattern (did-you-meet toggle, tag selection, free text, submit, error handling). Converting the modal into a page component reuses ~80% of the existing logic.

## Findings

**Architecture review:** `FeedbackService.getMyForm()` takes `(meetingId, userId)`, not `(formId, userId)`. The API endpoint uses `formId` directly. Add `getFormById(formId)` to the service interface.

**Simplicity review:** Unwrap `FeedbackModal.svelte` from its overlay, keep internal logic, add vocabulary loading from API and share toggles. Estimated reuse: ~70 lines of 85.

## Proposed Solutions

### Add getFormById + refactor FeedbackModal into FeedbackForm
1. Add `getFormById(formId: string): Promise<FeedbackForm | null>` to `FeedbackService` interface
2. Update `GET /api/feedback/[id]` to use the service method
3. Extract `FeedbackModal.svelte` logic into `FeedbackForm.svelte` (remove overlay wrapper)
4. Embed `FeedbackForm.svelte` in `/feedback/[id]/+page.svelte`

- **Effort:** Small-Medium (2 hours)
- **Risk:** Low

## Acceptance Criteria

- [ ] `FeedbackService` has `getFormById(formId)` method
- [ ] `GET /api/feedback/[id]` uses the service method, not direct Supabase query
- [ ] Existing FeedbackModal interaction logic reused in the feedback page
- [ ] Vocabulary loaded from API (not hardcoded tags)

## Resources

- Service pattern: `docs/solutions/architecture/service-layer-and-test-portability-patterns.md`
- Existing service: `src/lib/services/feedback.ts`
- Existing modal: `src/lib/components/FeedbackModal.svelte`
- API route: `src/routes/api/feedback/[id]/+server.ts`
