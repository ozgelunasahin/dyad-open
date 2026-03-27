---
title: "feat: v0.1 Deploy Readiness — Security + Route Rename + Quick Wins"
type: feat
status: active
date: 2026-03-27
origin: docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md
---

# v0.1 Deploy Readiness

Get dyad.berlin ready for first invited testers. Security hardening, route rename, and small UX fixes. Ship today.

## Phase 1: Security Hardening

### 1a. HTML Injection in Email Templates (#035)

User-supplied `displayName` interpolated directly into HTML emails without escaping.

**Files:** `src/routes/api/contact/+server.ts`, `src/routes/api/invites/+server.ts`

**Fix:**
- [x] Create `src/lib/utils/escape-html.ts` with `escapeHtml()` (escape `&`, `<`, `>`, `"`, `'`)
- [x] Apply to all user-supplied values in both email templates
- [x] Hardcode origin as `PUBLIC_SUPABASE_URL` or env var instead of `request.headers.get('origin')` (fixes #040 too)

### 1b. TimeSlot Input Validation (#049)

No runtime validation on slot fields. Malformed data passes straight to DB.

**Files:** `src/lib/services/prompt-command.ts` (inside `validateAndInsertSlots`)

**Fix:**
- [x] Validate `start_time` is valid ISO 8601 date, at least 1 hour in the future
- [x] Validate `duration_minutes` is integer, 15-480 range
- [x] Validate `location` has required fields: `name` (string), `address` (string), `lat` (number, -90 to 90), `lng` (number, -180 to 180)
- [x] Return clear error messages per field

### 1c. Password Policy (#041)

Currently 6-char minimum. NIST says 8.

**Files:** `src/routes/join/+page.server.ts`

**Fix:**
- [x] Change minimum from 6 to 8 characters
- [x] Add maximum of 128 characters
- [x] Update error message text

## Phase 2: Route Rename (#082)

Rename `/prompts/` to `/conversations/` in user-facing routes. API endpoints and database stay as-is.

**Existing plan:** `docs/plans/2026-03-27-refactor-conversation-route-rename-plan.md`

**Fix:**
- [x] Rename `src/routes/(app)/prompts/` → `src/routes/(app)/conversations/`
- [x] Rename `src/routes/(editor)/prompts/` → `src/routes/(editor)/conversations/`
- [x] Update all `href="/prompts/..."` and `goto('/prompts/...')` across all `.svelte` files (~20 references)
- [x] Update `SearchOverlay.svelte` onSelect callback
- [x] Add redirect in `hooks.server.ts`: `/prompts/*` → `/conversations/*` (302 for now)
- [x] Verify E2E tests still pass (update test URLs)

## Phase 3: Quick UX Wins

### 3a. Cover Image URL Validation (#080)

Accept only Supabase storage URLs, reject arbitrary external URLs.

**Files:** `src/routes/api/prompts/+server.ts`, `src/routes/api/prompts/[id]/+server.ts`

**Fix:**
- [x] Validate `coverImageUrl` starts with `PUBLIC_SUPABASE_URL + '/storage/'`
- [x] Reject with 400 if external URL

### 3b. Empty Cover Placeholder Styling (#088)

Placeholder divs lack border-radius, look inconsistent with the rest of the design.

**Files:** `src/routes/(app)/discover/+page.svelte`, `src/routes/(app)/profile/+page.svelte`

**Fix:**
- [x] Add `border-radius: inherit` to `.thumb-placeholder`
- [x] Verify parent `overflow: hidden` clips correctly

## v0.2 Roadmap

Items deferred from v0.1. Prioritise based on tester feedback.

### UX & Design
- **#083** — Unify conversation + meeting into one view (biggest UX improvement)
- **#086** — Map BottomSheet blocks map interaction (non-modal overlay)
- **#087** — Restore fuzz circles on map (privacy UX context)
- **#089** — Invitation flow design alignment (card-based redesign)
- **#084** — Show engagement status on discover cards ("You responded")
- **#085** — Review back navigation UX with user testing data
- **#081** — RotatingHeadline inclusive language
- **#073** — Extract user-facing copy to central file

### Architecture & Quality
- **#075** — Service layer bypasses (direct Supabase queries in routes)
- **#069** — FeedbackService missing getFormById
- **#068** — Agent-native API gaps (discover, gate check, invitations)
- **#051** — Extract LocationService interface (sovereignty)
- **#065** — Location search server proxy (sovereignty)
- **#057** — Production service factory
- **#054** — Typed errors and proper HTTP status codes
- **#050** — Publish/republish transactional safety

### Performance
- **#070** — TipTap bundle lazy loading
- **#052** — Discover feed post-fetch filtering (push to DB)
- **#053** — Nominatim optimization (pre-compute at selection time)
- **#058** — Prompt query Promise.all parallelization

### Security (non-blocking)
- **#044** — confirm_user_email RPC audit + add to migrations
- **#066** — Upload MIME validation + body size limits
- **#062** — Auth guard audit for all page routes

### Testing
- **#055** — Domain layer unit tests (pure functions)
- **#056** — pgTAP INSERT RLS tests
- **#072** — Integration test cleanup (feedback forms)

### Polish
- **#048** — Extract configuration constants
- **#071** — Frontend polish items (cache headers, lazy loading, privacy indicator)

## Acceptance Criteria

- [ ] No HTML injection possible in emails
- [ ] TimeSlot fields validated at service layer
- [ ] Password minimum 8 characters
- [ ] All user-facing URLs use `/conversations/` not `/prompts/`
- [ ] Old `/prompts/` URLs redirect to `/conversations/`
- [ ] Cover image URLs validated against storage origin
- [ ] Placeholder thumbnails have proper border-radius
- [ ] E2E tests pass
- [ ] Deployed to production

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md](docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md)
- **Route rename plan:** [docs/plans/2026-03-27-refactor-conversation-route-rename-plan.md](docs/plans/2026-03-27-refactor-conversation-route-rename-plan.md)
- Todos: #035, #040, #041, #049, #080, #082, #088
- v0.2 deferred: #044, #048, #050-058, #062, #065, #066, #068-073, #075, #081, #083-087, #089
