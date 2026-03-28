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
- `advance_scheduled_meetings()` — every 5 minutes (transitions meetings to awaiting_feedback when start time passes, creates feedback forms)
- `expire_stale_invitations()` — every hour (expires unresponded invitations — BUT see policy change below)
- `archive_stale_prompts()` — every hour (archives conversations where all future time slots have expired — rolling 7-day window)

**Policy change: invitation cutoff.** Users CAN send invitations right up until the timeslot start time (removing the previous 12-hour cutoff on sending). The 12-hour rule applies only to cancellation: if you accept a meeting within 12 hours of start time, you cannot cancel without consequence. This needs to be clearly communicated in the UI when accepting (copy in copy.ts, e.g., "This meeting starts in X hours. Once you accept, you won't be able to cancel.").

- [ ] Enable pg_cron extension on remote Supabase
- [ ] Create cron schedules for all 3 functions
- [ ] Verify `expire_stale_invitations` uses slot start time (not 12h before) as the cutoff — invitations should only expire when the slot's start time actually passes
- [ ] Verify `archive_stale_prompts` correctly identifies conversations with no future slots
- [ ] Review `accept_invitation` RPC: remove or adjust the 12-hour rejection guard. Accepting within 12 hours is allowed, but the UI must warn about the cancellation consequence.
- [ ] UI: when accepting a meeting starting within 12 hours, show a warning (copy from copy.ts)
- [ ] Test: create a meeting with a past start time, verify feedback forms appear
- [ ] Seed script: create two users in "met but haven't given feedback" state (meeting completed, feedback forms `due`, feedback gate active) for testing the feedback flow end-to-end
- [ ] Fix seed script: `insert` for slots creates duplicates on re-run (use `upsert` or check for existing). This caused duplicate timeslots on dyad.berlin/conversations/seed-conv-belonging.
- [ ] Consider DB constraint: no unique constraint prevents two slots at the same time for the same prompt. Add a check constraint or unique partial index on `(prompt_id, start_time)` to prevent this at the data level.

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
- [ ] **Add `/admin` to feedback gate exemption list in `hooks.server.ts`** — if the admin has a due feedback form, they must still access the admin panel. Without this, the system stops working unattended.
- [ ] `/admin/waitlist` — list `contacts` table entries, sorted by newest. Show: name, email, city, freewrite excerpt, date. "Invite" button per row that calls `POST /api/invites`. **Show invited/not-invited status** (join `contacts` with `invitations` table on email). Filter: "Not yet invited" / "All".
- [ ] `/admin/feedback` — list `app_feedback` table entries AND `feedback_forms.share_with_platform` entries. Show: user, page URL or meeting context, body, date.
- [ ] Sidebar link "Admin" visible only to users with `can_publish_sites`
- [ ] `/admin/settings` — simple key-value config flags. First flag: `show_fully_booked_conversations` (boolean, default true). Stored in a `config` table. Read by the discover query to control visibility of conversations where all slots are confirmed.
- [ ] Minimal styling — use existing design tokens, no custom design needed

## Must Also Ship (promote from should-fix — one-line SQL fixes, ship with B5 migration push)

### S1. Notifications INSERT policy — any user can spam any other user

- [ ] Fix: `WITH CHECK (auth.uid() = user_id)` or remove INSERT from authenticated entirely

### S2. `archive_stale_prompts` callable by any authenticated user

**Source:** Security sentinel (M4)

No REVOKE on this SECURITY DEFINER function. Any tester could call it and wipe the discover feed.

- [ ] `REVOKE EXECUTE FROM public; GRANT EXECUTE TO service_role;`

### S3. Password minimum mismatch (frontend 6, server 8)

**Source:** Story 1 agent, security sentinel, spec-flow analyzer (all found it)

Join page HTML says `minlength={6}`, hint text says "At least 6 characters", server requires 8. Password update in login also allows 6.

- [ ] Align all to 8: join form `minlength`, hint text, login password update validation

### S6. "New conversation" button not discoverable

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

### S12. Frontend design polish (including Ozge's feedback 2026-03-28)

Items flagged by user, co-founder, and agents:

**Landing page:**
- [ ] Replace right-side conversation cards with the full discover view (list + map toggle) for anonymous visitors. Reuse MapView + list components. Pin clicks and card clicks open the waitlist modal (gated — no navigation to conversation detail).
- [ ] Add "private beta" label (same font as current "log in")
- [ ] Move login button to a more intuitive position (near "join waitlist", not hidden top-right in monospace)
- [ ] Login opens as modal (same as waitlist modal, S9) with "Already have an account?" toggle
- [ ] Conversation cards show booked/available status (e.g., "2/3 slots booked" indicator)

**Navigation + notifications:**

The sidebar is being removed. FloatingNav becomes the primary navigation on ALL viewports (mobile and desktop). The exact desktop layout can evolve, but v0.1 must ship with a working solution.

**v0.1 minimum (must ship):**
- [ ] Remove left sidebar from discover (and all pages)
- [ ] FloatingNav on all pages, both mobile and desktop
- [ ] Add profile button to FloatingNav with notification badge (count of: pending invitations + due feedback + cancelled meetings)
- [ ] Sign out accessible from profile page (not nav — keep nav clean)
- [ ] Same actions and information available on mobile and desktop — no features hidden by viewport

**Open design question (refine during/after alpha):**
- Should desktop FloatingNav be top-anchored (like current) or evolve into a persistent header?
- Exact layout of nav items at wider viewports
- Whether notification badge opens a dropdown or just navigates to profile

**Map view:**
- [ ] Pin click: show conversations within the clicked fuzz region, NOT all in the Bezirk. Sort by distance to fuzz centroid. Don't show neighbourhood name as the BottomSheet header — use a neutral label or count.
- [ ] Single-conversation pins show just that conversation
- [ ] **Cover image thumbnails in BottomSheet list must match discover list view** — use the same fixed crop + aspect ratio. Currently BottomSheet uses 64x64 squares, discover uses 88x96 rectangles. Pick one approach (the BottomSheet's fixed square crop is better — use it for both).

**Conversation detail:**
- [ ] Show neighbourhood next to username and date (e.g., "@mira · Thu, Mar 26 · Neukölln")
- [ ] Date display: clarify this is "published on" date. Add "published" or "edited" label. (Copy in copy.ts when it exists)
- [ ] Explainer text before response: "If this is a conversation you want to have, respond to unlock invitation"
- [ ] Change "Write a response..." placeholder to "Write a comment..." (Ozge: "change respond to comment") — all placeholder text lives in copy.ts
- [ ] Remove "← back to discover" text link (use browser back / nav)
- [ ] Progressive meeting availability: before responding, show a teaser ("Available to meet · Neukölln · 1 slot this week"). After responding, reveal full SlotCard components. This signals the conversation lifecycle without being too explicit — anticipation, not a form.
- [ ] After responding + selecting a slot: show optional meeting note ABOVE the "Send invitation" button (currently below — confusing order). Make it a proper textarea (not single-line input) so it's usable on mobile.
- [ ] After sending invitation: immediately show the correct state (one slot marked "invited" + greyed out, others still visible). Currently the "invitation sent" view is different from the refreshed view — should be identical without needing a refresh.
- [ ] Consistent spacing between all elements (Send button → slots gap fix from S7)
- [ ] Slots in the past or less than 1 hour away: show a user-facing message ("This time has passed" or "Too soon to book"), not an error. This is a valid interaction, not an exception — handle gracefully in the UI, don't bubble up a server error. Copy in copy.ts.

**Discover:**
- [ ] **Visibility policy change:** Conversations with pending invitations or some slots confirmed always remain visible on discover — this is not configurable, it's the rule. Conversations with ALL timeslots confirmed: also visible by default, but **configurable via admin flag** (default: show). The author's own conversations should also be visible (currently filtered out with `.neq('author_id', userId)` at `prompt-query.ts:48`). Remove the `.eq('accepted', false)` slot filter that currently hides these.
- [ ] **Confirmed timeslots hidden from non-participants** (safeguarding): accepted/confirmed slots must NOT be shown to potential inviters, as this reveals where a user will be at a specific time. Only unconfirmed slots are visible to others. The pre-response teaser should show: count of available (unconfirmed) slots and approximate region(s).
- [ ] **Multiple invitations per slot:** Authors can receive multiple invitations for the same timeslot. Authors can confirm meetings for multiple timeslots. This is already supported by the DB schema — verify the UI does not prevent it.
- [ ] Check stability of which conversations are shown — ensure consistent ordering so the page doesn't jump between visits
- [ ] Cover image thumbnails: use consistent fixed crop + aspect ratio (match map list view)
- [ ] Search: keep current text-matching search for v0.1. Note for v0.2: explore embeddings-based semantic search (with a critical view on what this means for sovereignty and data processing).

**Profile:**
- [ ] Group under a) Conversations and b) Meetings (already the structure, verify naming)
- [ ] "Stack of cards" preview for each section — show top 2-3 items stacked/overlapping, click through to full list. This is the profile summary view; the full list is a sub-page or expanded view. (Future: meetings page with calendar view.)
- [ ] Fix meeting `general_area` always null — **real data bug**: `accept_invitation` RPC (`20260331`) doesn't copy `exact_location` or `general_area` from `time_slots` to `meetings` when creating the record (line 66-73). Fix the INSERT to include these columns. Also: remove the `?? 'TBD'` fallback — show the actual null so bugs surface. No defensive fallbacks during alpha.
- [ ] **Meeting cancellation is broken in three ways:** (1) Uses browser `confirm()` dialog instead of an in-app UI element — must be replaced with a proper modal/inline confirmation that matches the app's design language. (2) Clicking OK doesn't actually cancel — the API call fails (likely B3 column name issue or RPC parameter mismatch). (3) No notification to the other party — cancellation must create a profile notification (attention section) so the other person knows the meeting is off. All three must be fixed.
- [ ] Visual distinction between conversations started vs responded to (CSS class hooks, can be subtle for now)

**Editor:**
- [ ] Add "Edit" link on own published conversation detail page
- [ ] Body placeholder text is missing — add descriptive placeholder (in copy.ts)
- [ ] Add "Archive" button on own conversation detail page
- [ ] Body placeholder text needs to be more descriptive

**Email copy:**
- [ ] Invite email: change "a community of independent thinkers who meet through writing" → inclusive language per design principles ("Avoid intellectualism signals")
- [ ] Fix relative image paths in all email templates (`/images/logo-dark.png` → `https://dyad.berlin/images/logo-dark.png`)

**Responsive:**
- [ ] Audit all pages at mobile viewport (375px) — identify layout breaks
- [ ] Audit at large desktop viewport (2560px+) — ensure content doesn't stretch awkwardly
- [ ] Test on tablet-sized viewports (768-1024px) — verify sidebar/FloatingNav handoff
- [ ] Response submission: no confirmation feedback (subtle transition)
- [ ] Conversation 404: silent redirect to discover, should show message
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
- Query parallelization (discover waterfall S4, detail waterfall S5) — invisible at alpha scale
- Centralized copy / string management (S8) — go straight to DB-backed i18n in v0.2
- Mobile Playwright tests (S10) — manual phone testing for alpha
- BottomSheet non-blocking interaction (S11) — workaround exists
- Decline invitation button (S13) — ignoring works at alpha scale
- Email notifications for events (S14) — opted-in testers will check the app
- Landing page discover embed with map (S12 subset) — current layout works for invite-link arrivals
- Waitlist modal on landing page (S9) — redirect to /waitlist works
- Progressive slot disclosure (S7 partial) — showing all slots is fine for alpha
- Feedback editing after submission (Story 4 requirement — defer, document explicitly)
- Add-to-calendar (Story 2/4 open question — defer explicitly)
- Feedback reveal notification (how users discover the reveal is available)

## Documentation to Update

### Design principles / engineering principles to add:

- [ ] **No defensive fallbacks during alpha.** Add to design principles or a new engineering principles doc: don't use `?? 'TBD'`, `?? 'Unknown'`, or `?? 0` patterns that silently mask null data. Show the actual null so bugs surface. Defensive fallbacks are for public releases, not alpha. The `general_area ?? 'TBD'` hid a real data bug for weeks.
- [ ] **Audit existing codebase for `?? 'TBD'` and similar patterns** — replace with explicit null display or debug indicators during alpha.
- [ ] **Safeguarding.** Add a dedicated section to design principles. The platform facilitates in-person meetings between strangers — safeguarding must be on our radar from the start. Key principles:
  - Confirmed meeting locations and times must NEVER be visible to non-participants (reveals where someone will be)
  - Fuzzed locations provide approximate area for discovery, not precise coordinates
  - No pre-meeting contact (already a principle — also a safeguarding measure)
  - Cancellation and no-show patterns should be monitored (moderator review)
  - Account reputation prevents bad actors from resetting (marks tied to email)
  - Future: consider what data is visible to whom at each stage of the lifecycle, with a safeguarding lens on every decision

### Stale content fixes (from crosslink audit):

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
