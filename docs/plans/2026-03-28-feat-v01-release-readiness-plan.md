---
title: "feat: v0.1 Release Readiness — gap analysis, blockers, and sprint plan"
type: feat
status: active
date: 2026-03-28
---

# v0.1 Release Readiness

Full gap analysis from 7 parallel review agents (security sentinel, architecture strategist, spec-flow analyzer, performance oracle, story gap analysis, infrastructure readiness, plus earlier Story 1 deep-dive).

## Operating Constraints

**This is an alpha playtest for a select group of testers.** The onboarding process doesn't need to be fully polished — testers can see some edges. What matters:

1. **The core user journey must be representative.** Testers should be able to give meaningful feedback on: discovering conversations, writing responses, inviting to meet, accepting invitations, attending meetings, and giving feedback. The UX/UI for these must be representative of the intended experience.

2. **Must run unattended for weeks.** The main developer will not be fully available after launch. The entire process — new users joining from the waitlist, getting approved, creating accounts, having conversations and meetings — must work without manual database intervention. Cron jobs must run. Email must deliver. The admin must be able to operate from an in-app panel.

3. **Admin panel required (functional, not polished).** An app admin needs to:
   - View waitlist submissions
   - Approve/invite users (not via curl)
   - View in-app feedback and bug reports from testers
   - No design polish required, but must be functional

4. **In-app feedback for testers.** A report/feedback button that lets testers submit issues and suggestions. An admin view to read and triage these.

## Definition of v0.1 Done

A selected tester can: arrive at the landing page → join the waitlist → admin approves via in-app panel → tester receives invite email → creates account → browses conversations on discover (list + map) → reads a conversation → writes a response → selects a time slot → sends an invitation → author accepts → both attend the meeting → both submit feedback → see each other's feedback → continue using the app → submit bug reports/feedback via report button.

All of this works without developer intervention. Cron jobs run automatically. Email delivers. Admin operates from the app.

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

### B7. App feedback / report button + admin view

**Source:** Spec-flow analyzer, user requirement, operating constraint #4

No mechanism for testers to report issues or provide feedback from within the app. No way for admin to view these reports.

**Fix:**
- [ ] Create `app_feedback` table: `id, user_id, page_url, user_agent, body, created_at`
- [ ] Create `POST /api/feedback/app` endpoint (authenticated, inserts to table)
- [ ] Add a "Feedback" button in the sidebar footer (desktop) and FloatingNav (mobile)
- [ ] On click: open a modal capturing: free text + auto-captured current URL and browser info
- [ ] Submit to `app_feedback` table

### B8. Admin panel (functional, not polished)

**Source:** Operating constraint #2 and #3

The admin must be able to operate the alpha test without developer intervention. Currently inviting users requires curl and there's no way to view waitlist or feedback.

**Fix:**
- [ ] Create `/admin` route group with admin auth guard (`can_publish_sites` on profile)
- [ ] `/admin/waitlist` — list `contacts` table entries, sorted by newest. Show: name, email, city, freewrite excerpt, date. "Invite" button per row that calls `POST /api/invites`.
- [ ] `/admin/feedback` — list `app_feedback` table entries. Show: user, page URL, body, date.
- [ ] `/admin/users` — list `profiles` joined with invitation status. Show: username, email, joined date.
- [ ] Sidebar link "Admin" visible only to users with `can_publish_sites`
- [ ] Minimal styling — use existing design tokens, no custom design needed

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

### S7. Conversation detail — spacing and progressive slot disclosure

**Source:** User feedback (screenshot)

No padding between Send button and slot cards. Also: showing full slot details before the user has responded is premature — it frontloads scheduling UI when the user hasn't committed to engaging yet.

**Fix:**
- [ ] Add `margin-bottom: var(--space-4)` between Send button and slots section
- [ ] Before responding: show only a teaser — "Available to meet in Neukölln · 1 slot this week" (region + count, no specific times)
- [ ] After responding: reveal full SlotCard components with specific times (current behaviour)
- [ ] This aligns with the explorer archetype (Miri) — give a reason to respond without overwhelming with scheduling

### S8. Centralized copy / string management

**Source:** User requirement, existing todo #073

All user-facing text (placeholder text, button labels, guidance copy) is hardcoded in Svelte components. Changing a word requires editing multiple files.

**Fix for v0.1:**
- [ ] Create `src/lib/copy.ts` — typed object with all user-facing strings
- [ ] Components import strings from this module instead of hardcoding
- [ ] Single file to update when iterating on copy

**Architecture for v0.2 (EN/DE localization):**
- Move strings to a Supabase table (`copy` or `translations`) keyed by `(key, locale)`
- Admin-editable: change copy without deploying code
- A/B experiments: serve different copy variants by user segment
- Use `svelte-i18n` or `paraglide-js` as the interpolation layer on top of the DB store
- The v0.1 `copy.ts` structure becomes the key schema for the database table

### S9. Landing page — waitlist modal on conversation click

**Source:** User requirement

Currently, anonymous users clicking a conversation card on the landing page navigate to `/waitlist` (a separate page). They should instead see a modal overlay with the waitlist form, so they can enter their details and return to browsing — or dismiss and keep looking at conversations.

**Fix:**
- [ ] Create a WaitlistModal component (reuses the waitlist form fields)
- [ ] Landing page: conversation card click opens the modal instead of navigating
- [ ] Modal has: freewrite, name, city, email fields + submit + close button
- [ ] On submit: same `POST /api/contact` call, show confirmation inline
- [ ] On dismiss: return to landing page, conversation cards still visible
- [ ] Note: this updates the earlier "no modals" principle — modals are fine when they keep the user in context. The principle is about not interrupting flow with tutorial overlays, not about avoiding all overlays.

### S10. Mobile Playwright tests

Full E2E test suite running in mobile viewport (375x667). We have not verified the mobile experience.

- [ ] Add mobile viewport Playwright config
- [ ] Run existing smoke + core flow tests at mobile size
- [ ] Fix any layout/interaction issues found

### S11. BottomSheet map interaction

The blocking backdrop was reverted. Need a proper solution where the sheet doesn't block map panning but can still be dismissed.

- [ ] Design approach: partial backdrop (covers only sheet height) or swipe-to-dismiss
- [ ] Implement and test on mobile

### S12. Frontend design polish

Items flagged by user and agents:
- [ ] Audit all pages at mobile viewport — identify layout breaks
- [ ] Response submission: no confirmation feedback (subtle transition)
- [ ] Conversation 404: silent redirect to discover, should show message

### S13. Decline invitation

Authors can only accept or ignore. No decline button.

- [ ] Add "Not this time" button that transitions invitation to `declined`
- [ ] Notify the inviter

### S14. Email notifications for key events

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
- [ ] Report/feedback button exists in the app (B7 fixed)
- [ ] Admin can view waitlist, invite users, read feedback — all in-app (B8 fixed)
- [ ] Attention badge shows correct count (B3 layout fix)
- [ ] Security: notifications INSERT policy fixed (S1)
- [ ] Security: archive function restricted to service_role (S2)
- [ ] System runs unattended: cron jobs active, email delivers, no manual DB ops needed

### v0.1 continued (same release, stretch goals)

- [ ] Progressive slot disclosure (teaser before response, full after)
- [ ] Copy centralized in `src/lib/copy.ts`
- [ ] Waitlist modal on landing page conversation click
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
