---
title: "feat: v0.1 Release Readiness — gap analysis, blockers, and sprint plan"
type: feat
status: active
date: 2026-03-28
---

# v0.1 Release Readiness

Full gap analysis from 7 parallel review agents (security sentinel, architecture strategist, spec-flow analyzer, performance oracle, story gap analysis, infrastructure readiness, plus earlier Story 1 deep-dive). This plan defines what must ship for v0.1, what can wait for v0.1.1 (days), and what's deferred to v0.2.

## Definition of v0.1 Done

A selected tester can: arrive at the landing page → join the waitlist → receive an admin invite → create an account → browse conversations on discover (list + map) → read a conversation → write a response → select a time slot → send an invitation → author accepts → both attend the meeting → both submit feedback → see each other's feedback → continue using the app.

Plus: a report button for in-app feedback and bug reports.

## Blockers (v0.1 cannot ship without these)

### B1. `confirm_user_email` RPC broken — signup will 500

**Source:** Story 1 agent, security sentinel, architecture strategist (all three found it independently)

Migration `20260326_fix_anon_function_access.sql` revoked execute from both `anon` and `authenticated`. The join flow calls it via the anon-key client. Every new signup will fail.

**Fix:** Create a combined `consume_invitation_and_confirm(token, email)` SECURITY DEFINER function that validates the token internally and confirms the email. Grant to `anon`. This is the most secure approach — prevents confirming arbitrary emails. Update `join/+page.server.ts` to call the single RPC instead of the `Promise.all` of `use_invitation` + `confirm_user_email`.

- [ ] Create combined RPC in a new migration
- [ ] Update join server to call single RPC
- [ ] Test: new user signup works end-to-end

### B2. `advance_scheduled_meetings` has no production trigger

**Source:** Architecture strategist, spec-flow analyzer

The function transitions meetings from `scheduled` → `awaiting_feedback` and creates feedback forms. Without it, meetings never complete, feedback forms never exist, the feedback gate never activates. The entire post-meeting flow is dead.

Similarly: `expire_stale_invitations` and `archive_stale_prompts` have no trigger.

**Fix:** Enable `pg_cron` on remote Supabase and schedule:
- `advance_scheduled_meetings()` — every 5 minutes
- `expire_stale_invitations()` — every hour
- `archive_stale_prompts()` — every hour

- [ ] Enable pg_cron extension on remote Supabase
- [ ] Create cron schedules for all 3 functions
- [ ] Test: create a meeting with a past start time, verify feedback forms appear

### B3. Wrong column names — feedback page renders blank

**Source:** Architecture strategist

`feedback/[id]/+page.server.ts` selects `user_a, user_b` but columns are `participant_a, participant_b`. Feedback page renders without meeting context.

Also: `(app)/+layout.server.ts` and `profile/+page.server.ts` query `feedback_forms` with `.eq('user_id', ...)` but column is `reviewer_id`. Attention badge always shows 0 for feedback.

**Fix:**
- [ ] Fix `feedback/[id]/+page.server.ts`: `user_a` → `participant_a`, `user_b` → `participant_b`
- [ ] Fix `(app)/+layout.server.ts`: `user_id` → `reviewer_id`
- [ ] Fix `profile/+page.server.ts`: `user_id` → `reviewer_id`

### B4. Production email delivery not wired

**Source:** Infrastructure agent, Story 1 agent

`email.ts` only speaks Mailpit format. No production provider configured. Invite emails will silently fail.

Also: email templates use relative image paths (`/images/logo-dark.png`) — broken in email clients.

**Fix:**
- [ ] Pick an EU email provider (Mailjet has EU data centre, matches sovereignty principle)
- [ ] Add conditional in `email.ts` for the provider's API format
- [ ] Set `EMAIL_API_URL` + `EMAIL_API_KEY` on Cloudflare Pages
- [ ] Fix image URLs to absolute (`https://dyad.berlin/images/logo-dark.png`)

### B5. Remote Supabase migrations not applied

**Source:** Infrastructure agent

All migrations exist in `supabase/migrations/` but have not been applied to the remote instance. The uploads bucket, RPC functions, and RLS policies don't exist on remote.

**Fix:**
- [ ] Run `supabase db push --linked` or apply migrations via Supabase dashboard SQL editor
- [ ] Verify: uploads bucket exists, RPC functions callable, RLS policies active

### B6. No revealed feedback UI

**Source:** Spec-flow analyzer, story gap analysis

Users submit feedback but never see what the other person wrote. The simultaneous reveal — a core design promise — is broken. Backend is complete (`getRevealedFeedback`, `GET /api/meetings/[id]/feedback`), just no frontend.

**Fix:**
- [ ] After feedback submission, if state is `locked`, show revealed feedback inline
- [ ] On meeting detail page, if meeting state is `completed`, show "Feedback" section with revealed `share_with_person` content and adjective tags

### B7. App feedback / report button

**Source:** Spec-flow analyzer, user requirement

No mechanism for testers to report issues or provide feedback from within the app.

**Fix:**
- [ ] Add a "Report" button in the sidebar footer (desktop) and FloatingNav (mobile)
- [ ] On click: open a form/modal capturing: current URL, browser info, optional screenshot, free text description
- [ ] Submit to a `bug_reports` table or a simple email to the team
- [ ] Alternatively: embed a lightweight tool (e.g., link to a Tally form with URL pre-filled)

## Should Fix (v0.1, but won't block testers if missed)

### S1. Notifications INSERT policy — any user can spam any other user

**Source:** Security sentinel (H1)

RLS policy only checks `auth.uid() IS NOT NULL`, not that `user_id` matches.

- [ ] Fix: `WITH CHECK (auth.uid() = user_id)` or remove INSERT from authenticated entirely

### S2. `archive_stale_prompts` callable by any authenticated user

**Source:** Security sentinel (M4)

No REVOKE on this SECURITY DEFINER function. Any tester could call it and wipe the discover feed.

- [ ] `REVOKE EXECUTE FROM public; GRANT EXECUTE TO service_role;`

### S3. Password minimum mismatch (frontend 6, server 8)

**Source:** Story 1 agent, security sentinel, spec-flow analyzer (all found it)

Join page HTML says `minlength={6}`, hint text says "At least 6 characters", server requires 8. Password update in login also allows 6.

- [ ] Align all to 8: join form `minlength`, hint text, login password update validation

### S4. Discover page query waterfall (3 sequential queries)

**Source:** Performance oracle (CRITICAL-1)

`getPublishedPrompts` runs slots and username queries sequentially when they could be parallel. Adds ~100ms.

- [ ] Parallelize with `Promise.all` (pattern already exists in `getPublishedPromptsPublic`)

### S5. Conversation detail author view — sequential query waterfall

**Source:** Performance oracle (CRITICAL-3)

Author page runs 4 sequential queries that could be 2 parallel batches. Adds ~200ms.

- [ ] Restructure into two `Promise.all` calls

### S6. "New conversation" button not discoverable

**Source:** Spec-flow analyzer

The FloatingNav has a `+` button on discover, but there's no persistent "create" action in the sidebar.

- [ ] Already exists in FloatingNav — verify it's visible on all screen sizes

## v0.1.1 Sprint (hours to days after v0.1)

### Mobile Playwright tests

Full E2E test suite running in mobile viewport (375x667). We have not verified the mobile experience.

- [ ] Add mobile viewport Playwright config
- [ ] Run existing smoke + core flow tests at mobile size
- [ ] Fix any layout/interaction issues found

### BottomSheet map interaction

The blocking backdrop was reverted. Need a proper solution where the sheet doesn't block map panning but can still be dismissed.

- [ ] Design approach: partial backdrop (covers only sheet height) or swipe-to-dismiss
- [ ] Implement and test on mobile

### Frontend design polish

Items flagged by user and agents:
- [ ] Audit all pages at mobile viewport — identify layout breaks
- [ ] Slot cards: no visual cue that they're not clickable before responding
- [ ] Response submission: no confirmation feedback (subtle transition)
- [ ] Conversation 404: silent redirect to discover, should show message

### Decline invitation

Authors can only accept or ignore. No decline button.

- [ ] Add "Not this time" button that transitions invitation to `declined`
- [ ] Notify the inviter

### Email notifications for key events

- [ ] Invitation received
- [ ] Invitation accepted
- [ ] Meeting cancelled by other party

## Deferred to v0.2

- Public profiles
- Open conversations for non-members (ambassador model)
- Infrastructure for 1000 users (indexing, connection pooling, CDN, rate limiting, monitoring)
- Venue partnerships integration
- Solidarity pricing tiers
- Portable reputation (VCs)
- Notifications UI (bell icon, notification list)
- Onboarding / first-run experience
- Republish archived conversations (API exists, no UI)
- Delete draft conversations

## Stale Documentation to Fix

From crosslink audit (already partially addressed in consolidation PR #62):

- [ ] `design-principles.md`: "Comments" heading → "Responses" (per domain language)
- [ ] `design-principles.md`: "Following profiles" mentioned but undocumented — add guardrails or remove
- [ ] `design-system.md`: profile 2x2 grid reference may be stale (profile was restructured)
- [ ] `design-system.md`: FloatingNav calendar button — verify against implementation
- [ ] `shared-infrastructure-review-2026-03-25.md`: legacy canvas code reference — stale

## Acceptance Criteria

### v0.1 (must pass before tagging)

- [ ] New user can sign up via invite link (B1 fixed)
- [ ] Meetings transition to feedback state automatically (B2 fixed)
- [ ] Feedback form shows meeting context (B3 fixed)
- [ ] Invite emails deliver to real addresses (B4 fixed)
- [ ] Remote Supabase has all migrations (B5 fixed)
- [ ] Users see each other's feedback after both submit (B6 fixed)
- [ ] Report button exists in the app (B7 fixed)
- [ ] Attention badge shows correct count (B3 layout fix)
- [ ] Security: notifications INSERT policy fixed (S1)
- [ ] Security: archive function restricted to service_role (S2)

### v0.1.1 (days after v0.1)

- [ ] Mobile Playwright tests pass
- [ ] BottomSheet doesn't block map interaction
- [ ] Invitation decline button exists
- [ ] Email notifications for invitations and meetings

## Sources

- 7 parallel review agents: security-sentinel, architecture-strategist, spec-flow-analyzer, performance-oracle, story-gap-analysis (stories 1-4), infrastructure-readiness, story-1-deep-dive
- User stories: `docs/stories/001-004`
- Design principles: `docs/design/design-principles.md`
- Existing todos: `todos/090-pending-p1-remote-supabase-deploy-checklist.md`
- Crosslink audit from consolidation PR #62
