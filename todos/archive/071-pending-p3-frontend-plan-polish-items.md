---
status: pending
priority: p3
issue_id: "071"
tags: [code-review, frontend-plan, polish]
dependencies: []
---

# Frontend Plan Polish Items (Consolidated P3)

## Problem Statement

Various minor improvements identified across all review agents. None block implementation, but address them during or after the relevant phase.

## Findings

### Performance
- **Landing page Cache-Control:** Carry forward `s-maxage=60, stale-while-revalidate=300` from existing landing page to the rewrite (Phase 1)
- **Cover image lazy loading:** Add `loading="lazy"` and explicit `width`/`height` to prevent CLS on feed pages
- **Vocabulary caching:** Add `Cache-Control: max-age=3600` to `GET /api/vocabulary` response
- **Discover page query parallelization:** Already tracked in todo #058

### Security
- **Rate limiting:** No rate limiting on prompt-domain API endpoints. Deferred — invite-only user base mitigates risk. See existing todo #002.
- **parseJsonBody prototype pollution:** Add `deepSanitize()` from feedback endpoint to shared utility
- **Comment privacy indicator:** Show "Only visible to you and the prompt author" near comment form

### Architecture
- **Progressive enhancement clarity:** Auto-save uses client-side `fetch`; comment/invitation/feedback forms should use SvelteKit form actions with `use:enhance`
- **`/prompts/new` creation mechanism:** Should use a SvelteKit form action that creates draft and redirects to `/prompts/[id]/edit`, not POST in load function

### Simplification
- **Defer republish flow:** Show archived prompts read-only on profile. Republish adds UI complexity no user will exercise on day one.
- **Defer "same location for all slots" shortcut:** Power user convenience that saves 1-2 clicks. Not needed for v0.1.
- **Simplify meeting cancel:** Use `confirm()` dialog instead of text input for cancellation reason.

## Acceptance Criteria

- [ ] Landing page has Cache-Control header
- [ ] Cover images use `loading="lazy"` in feed views
- [ ] Vocabulary API response includes cache header
- [ ] Comment form shows privacy indicator
- [ ] `/prompts/new` uses form action + redirect pattern

## Resources

- Performance review findings
- Security review findings
- Simplicity review findings
