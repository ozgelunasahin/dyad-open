---
title: "Alpha testing rollout — how we invite and onboard the first cohort"
type: feat
status: active
date: 2026-04-18
---

# Alpha testing rollout — how we invite and onboard the first cohort

## Overview

The app is feature-complete for v0.1 per `docs/ROADMAP.md`. PR #120 closes the last of the shared-infra quick wins; the core journey (discover → respond → invite → meet → feedback) has landed through PRs #107, #109, #111. What's left is to actually run the alpha: decide who gets in, confirm the invitation + onboarding mechanic survives contact with real inboxes, dispatch invites, collect feedback honestly, and define what "done with alpha" looks like before the next wave.

This plan mixes two layers: last-mile **technical readiness** (unit 1–2) and the **operational playbook** (unit 3–6). It is intentionally not a feature spec — the features exist. What it captures is the decisions and sequence that turn a shipped product into a running test.

## Problem Frame

The app has been dog-fooded internally and run through a small playtest in March (`docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md`). That playtest surfaced 20 issues; the P0 and P1 items have since been addressed in PR C (#111) and the earlier security + UX passes. We are now in the "ship-to-real-humans" window.

Risks unique to this stage, distinct from pre-launch engineering:
- **Silent failure modes** — a broken invitation email is worse than a broken feature, because a bounced invite leaves no evidence in our logs and the user simply never shows up.
- **Cohort size vs learning rate** — too small and we get anecdotes; too large and we can't triage feedback before it piles up.
- **Selection bias** — inviting the first 10 friends teaches us almost nothing about how strangers interpret the product.
- **Silence interpreted as success** — not hearing from a tester usually means they bounced, not that they're happy. Proactive check-ins beat waiting.
- **Loss of context window** — by the time feedback arrives we've moved on. Weekly triage prevents accumulated backlog from going stale.

The operating constraint (from the roadmap): _"Must run unattended for weeks. The main developer will have limited availability. A non-technical co-founder (admin) must be able to operate the platform from an in-app admin panel."_ That frames every decision below.

## Requirements Trace

- **R1.** Invitation emails reach production inboxes reliably. Mailpit-in-dev must not be what testers receive.
- **R2.** A test user going through `/waitlist` → admin-invite → `/join?token=...` → picks username → lands on `/discover` completes without hitting a dead end. Smoke-tested end-to-end before a single real invite goes out.
- **R3.** The first cohort is hand-picked from the existing waitlist with a defensible selection rule, not "first 10 that signed up".
- **R4.** Invitation dispatch is staggered (not all at once) with a templated personal message so we can correlate first-session behaviour to dispatch time.
- **R5.** Feedback is collected and triaged on a predictable cadence. Testers get a clear "how to reach us" channel beyond the in-app `?` button.
- **R6.** Alpha has explicit exit criteria — what we're watching for, what would stop us scaling, what would flip us to v0.2 work.

## Scope Boundaries

- **Not in this plan:** building the admin deny/hold flows from Story 001. Admin approval today is binary (invite-or-ignore) via the waitlist tab; deny/hold are deferred to v0.2.
- **Not in this plan:** automated email notifications for invitations-received / accepted / cancelled. Roadmap says deferred v0.2. Users get in-app attention cards for those events already.
- **Not in this plan:** the `/signup` OTP self-registration flow. That exists but is out of scope for this alpha — we're invite-only.
- **Not in this plan:** building a post-meeting feedback collection instrument outside the app. The app's own post-meeting feedback form is the primary data source. A lightweight out-of-band channel (email / Matrix) is for qualitative feedback only.
- **Not in this plan:** EU email provider migration (Resend → Mailjet). Separate plan; Resend is acceptable for this cohort while we validate the flow.
- **Not in this plan:** analytics re-enablement. PostHog is disabled per `d958c9d` and stays disabled for this alpha. Observation is manual + in-app feedback.

## Context & Research

### Relevant code and state

- **Admin waitlist triage** — `src/routes/(admin)/admin/waitlist/+page.svelte` reads contacts from the `contacts` table and exposes an **Invite** button per row. Button POSTs to `/api/invites`.
- **Invitation endpoint** — `src/routes/api/invites/+server.ts`:
  - Admin-gated via `locals.user.app_metadata.role === 'admin'`
  - 14-day expiry per invite (`INVITE_EXPIRY_DAYS`)
  - Idempotent on email: if a valid invite exists, resends the email for the same token rather than creating a duplicate
  - Sends HTML email via `sendEmail(...)` (from `src/lib/server/email.ts`)
- **Email abstraction** — `src/lib/server/email.ts`: `EMAIL_PROVIDER=mailpit|resend`. Default is mailpit (dev). Production needs `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` set in Cloudflare Pages env.
- **Registration flow** — `/join?token=...` → `src/routes/(auth)/join/+page.svelte`:
  - Token validated via `(auth)/join/+page.server.ts`
  - User picks username, password, confirms Berlin-based, submits
  - On success → `/discover` (post-Unit-6 of PR #111 copy is in `src/lib/copy.ts` under `copy.auth.*`)
- **Feedback surface** — `?` button on authenticated layouts only (post-PR-#114). Submits via `/api/feedback/app`. Types: bug, feature, report, other (PR #114 + #116). Admin feedback tab at `/admin/feedback` reads the table.
- **Attention cards on `/profile`** — surface pending invitations, cancellation notifications, etc. Users shouldn't need external prodding to see what needs their attention.
- **Seed data** — `supabase/seed.sql` populates test personas for local dev only. Production waitlist is whatever real humans have signed up for.

### Institutional learnings

- **`docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md`** — the March playtest. Most P0/P1 items are now addressed. The "what was confusing for first-time users" list there is the best available proxy for what to watch for in the fresh cohort.
- **`docs/stories/001-first-touch-to-registered-user.md`** — the canonical user-journey doc for invitation → registered-and-onboarded. Referenced for behaviour this plan expects to hold.
- **`docs/design/design-principles.md`** — the "healthy brain" and anti-engagement principles. Relevant because the invitation email, onboarding, and any nudges we send should uphold them.
- **`docs/design/user-archetypes.md`** — seekers, explorers, gatherers, in-betweeners. Selection rule below uses these.

### External references

- None for this plan. The operational choices (cohort size, cadence) are small-team judgement calls not research-driven.

## Key Technical Decisions

- **Cohort size: start with 8 ± 2 people.** Small enough to triage feedback weekly, large enough to see whether strangers actually match (two people per conversation, so ~4 potential matches). Scaling decision is explicit at the end of week 2.
- **Staggered dispatch: 2–3 per day across the first week.** Correlates first-session time to our ability to watch. Also surfaces infrastructure issues (rate limits, stale connections) at a pace we can respond to.
- **Selection rule: "sharp specific reads".** Pick from the waitlist for archetype mix (seeker / explorer / gatherer / in-betweener per `docs/design/user-archetypes.md`) plus whichever `join_motivation` freewrites land like actual use cases, not casual curiosity. Biased toward people who wrote something specific.
- **Dual feedback channels: in-app `?` button + a direct reply-to address in the invitation email.** The in-app button captures in-context complaints; the email gives testers a clear "you can just reply" affordance for longer-form thoughts.
- **Observation cadence: end-of-week-1 and end-of-week-2 check-ins.** Not meetings — short written digests by the owner, reviewed by the team, triaging what lands in `/admin/feedback` + the reply-to inbox.
- **Exit criteria over time-boxing.** The alpha ends when: (a) 4+ testers have completed the full core journey (meeting + feedback both sides), OR (b) we hit a P0 we can't triage fast enough. Calendar cap of 4 weeks as a hard ceiling.
- **No automated onboarding tour.** Per Story 001: "Absolutely NOT a tutorial/guide with modals around the interface." The invitation email carries the framing.

## Open Questions

### Resolved during planning

- **Q: Does invitation email delivery work against real inboxes today?** Not yet verified on production — Unit 1 covers this.
- **Q: Do we need to build any new admin tooling to select the first cohort?** No. Existing `/admin/waitlist` + filters + the `join_motivation` column are enough for 8–10 picks.
- **Q: Is there an onboarding screen between `/join` and `/discover`?** No — the design rejects it (Story 001). `/discover` is the onboarding surface.
- **Q: Do we need to write a separate post-alpha survey?** No for v0.1. The in-app post-meeting feedback is the primary instrument. Unit 5 captures the secondary out-of-band channel.

### Deferred to implementation

- Exact wording of the invitation email body (beyond the existing `copy.email.*`). Decide when drafting in Unit 4.
- Whether to open a dedicated Matrix/Slack channel for testers vs. using a reply-to email address. Decide in Unit 5 based on comms load — default is reply-to only unless it gets noisy.
- Whether to require a post-alpha "exit interview" with each tester. Not blocking; decide at week-2 check-in based on signal density.

## High-Level Technical Design

> *This illustrates the intended shape of the rollout for review, not implementation specification.*

```
 Pre-flight gates
 ├── Unit 1: Email delivery confirmed (Resend → real inbox)
 └── Unit 2: End-to-end smoke test (waitlist → invite → /join → /discover)

 Rollout week 1 (Unit 3 → Unit 4)
 ├── Day 0: Cohort 8 selected from waitlist (Unit 3)
 ├── Day 1–5: Staggered invites, 2/day (Unit 4)
 └── Rolling: in-app feedback watch (Unit 5)

 Rollout week 2 (Unit 5)
 ├── End week 1: Written digest + triage
 ├── Ongoing observation
 └── End week 2: Exit-criteria evaluation (Unit 6)

 Week 3–4 (contingent on exit criteria)
 ├── If green: second cohort (copy the playbook, scale to ~15)
 └── If red:  stop inviting, patch, rerun week 1 after patches land
```

## Implementation Units

- [ ] **Unit 1: Confirm production email delivery**

**Goal:** Prove end-to-end that an admin-issued invitation hits a real inbox via Resend, not Mailpit. Block the rollout on this.

**Requirements:** R1

**Dependencies:** None (independent pre-flight)

**Files:**
- Environment: set `EMAIL_PROVIDER=resend` and `RESEND_API_KEY` in the Cloudflare Pages production env (both already referenced by `src/lib/server/email.ts:16–17`).
- Verify (not modify): `src/lib/server/email.ts`, `src/routes/api/invites/+server.ts`

**Approach:**
- In Cloudflare Pages dashboard → Settings → Environment variables (Production): set `EMAIL_PROVIDER=resend`, set `RESEND_API_KEY` to the live Resend API key.
- Redeploy (or wait for the next push to main) so the env picks up.
- From `/admin/waitlist` in production, invite a burner address controlled by the team (not a tester's real email). Confirm the email arrives, the `/join?token=...` link works, token decodes correctly, join-flow completes with a test username.
- If email doesn't arrive: check Resend dashboard for delivery status. Check Cloudflare Pages logs for `[invites] Failed to resend invite email` or `[email] Resend requires RESEND_API_KEY`.
- After verification, **delete the test account** via Supabase dashboard so it doesn't pollute the real cohort's visible profiles.

**Patterns to follow:**
- Email provider shape in `src/lib/server/email.ts`.
- Admin-invite POST body in `src/routes/(admin)/admin/waitlist/+page.svelte`.

**Test scenarios:**
- Happy path: test invite to burner → email arrives with working token link → `/join` completes → `/discover` renders → tester visible in Supabase `profiles` table.
- Error path: simulate invalid Resend API key (set to obvious-bad value, attempt invite, expect 500 with console log on the server, no silent failure).
- Error path: expired token (wait 14 days + 1 min, or manually update `expires_at` to yesterday) → `/join?token=...` shows the "invitation expired" state per `copy.auth.invitationExpiredSubtitle`.

**Verification:**
- Burner email arrives within ~60s of admin click.
- Link produces a usable authenticated session.
- Resend dashboard shows the send event.
- Cloudflare Pages logs show no `[invites] Failed to resend` or `[email]` error lines.

---

- [ ] **Unit 2: End-to-end smoke test of the invitation → onboarded flow**

**Goal:** Walk the full waitlist → invitation → join → `/discover` path with a real browser (not Playwright) against production, checking every surface a first-time tester will see. Fix anything that bounces before inviting a real user.

**Requirements:** R2

**Dependencies:** Unit 1

**Files:**
- Verify only. Any gaps found become follow-up PRs (not modifications in this unit).

**Approach:**
- Go through the flow on the production deployment with a fresh burner:
  1. `/waitlist` form submission → confirmation email arrives (uses `/api/contact`, not `/api/invites`).
  2. Admin sees the new contact in `/admin/waitlist`.
  3. Admin clicks **Invite** → invitation email arrives.
  4. Tester clicks `/join?token=...` → form renders with readonly email, username field, password, Berlin checkbox.
  5. Submit → redirects to `/discover`.
  6. `/discover` renders the map + whatever published conversations exist. **Empty state handling** — if no conversations exist yet, does the discover page feel broken or like a reasonable empty state?
  7. Hit `/profile` → should render with "no conversations yet" section + drafts empty.
  8. Hit `+` on FloatingNav → new conversation editor should open at `/conversations/new/edit` (lazy-create from PR #119) without creating a stray draft row.
  9. Hit `?` (feedback button) → dialog opens, can submit bug / feature / report / other.
- Any surface that fails: capture a screenshot, file an issue, fix before dispatch. Go/no-go on rollout is gated on "no P0 dead-ends".

**Patterns to follow:**
- The P0/P1 severity rubric from `docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md` — re-use the same classification for anything found.

**Test scenarios:**
- Happy path: full journey end-to-end in <5 minutes with no confusion.
- Edge case: `/discover` with zero published conversations (real possibility if the cohort is literally first). Empty state needs to say "conversations are starting" rather than look broken — verify it does, else file an issue.
- Edge case: invitation token that has already been consumed — `/join?token=...` should show "invitation expired or already used" (via `!data.valid` branch in `(auth)/join/+page.svelte`). Verify.

**Verification:**
- A fresh tester account can complete waitlist → invite → join → discover → profile → editor → feedback without hitting a dead end.
- Any issue surfaced is either fixed, filed as a GitHub issue with severity, or explicitly accepted as known-acceptable before Unit 4 fires.

---

- [ ] **Unit 3: Waitlist triage + first-cohort selection**

**Goal:** Produce a concrete list of 8 ± 2 names to invite in week 1, with a written rationale per pick, so the team can sanity-check the selection before any email goes out.

**Requirements:** R3

**Dependencies:** Unit 2 (no point selecting a cohort if the flow doesn't work)

**Files:**
- Create: `docs/rollouts/2026-04-alpha-cohort-1.md` (private notes; this is where the selection rationale lives)
- No code changes.

**Approach:**
- Export or screenshot the current `/admin/waitlist` contents. Focus on:
  - `join_motivation` freewrite (what they wrote about why they want to join)
  - `based_in` (must be Berlin — filter out others)
  - `referred_by_username` (direct referral carries signal)
  - Approximate chronological position (rough recency of interest)
- Map each candidate to an archetype guess from `docs/design/user-archetypes.md` (seeker / explorer / gatherer / in-betweener).
- Select 8: aim for at least one of each archetype, bias toward specific freewrites (rejecting "sounds interesting" for "I've been trying to find people to talk about X for months" energy).
- Document each pick in the rollout doc with: email, name if provided, archetype guess, one-line rationale. This is the paper trail.

**Patterns to follow:**
- Selection heuristic is explicitly from the interop-roadmap M0 guidance: "Pick by 'sharpest specific read on one claim,' not by seniority." Same spirit here.
- `docs/design/user-archetypes.md` for the archetype mapping.

**Test scenarios:**
- Not applicable — this is a human-judgement unit with documentation as the output, not code.

**Verification:**
- `docs/rollouts/2026-04-alpha-cohort-1.md` exists with 8 named picks + rationale lines.
- At least one candidate per archetype represented.
- No obvious red flags (no bot-signups, no "just checking" freewrites, no non-Berlin addresses).

---

- [ ] **Unit 4: Invitation dispatch — staggered, templated, personal**

**Goal:** Send the 8 invitations across the first week at a rate that matches the team's ability to watch for issues, with a personal touch in the email body so it reads like "someone invited you" not "a platform sent you an automated message".

**Requirements:** R4

**Dependencies:** Unit 3

**Files:**
- Modify (if the default copy needs softening): `src/lib/copy.ts` `copy.email.*` block — verify the invitation email text supports a personal opener.
- Modify (maybe): `src/routes/api/invites/+server.ts` — optionally accept a `personalMessage` field in the POST body that gets rendered above the default copy. **Defer this unless Unit 4 shows the current email feels too canned.**

**Approach:**
- **Day 1 (Monday):** send 2 invites.
- **Day 2–3:** observe inbox, `/admin/feedback`, Supabase `profiles` for new rows. If anything broke, stop; if green, send 2 more.
- **Day 3–5:** continue at 2/day until the cohort is invited.
- **Reply-to address** in the invitation email is a monitored mailbox the owner checks at least every weekday. Not a no-reply.
- **One personal sentence** at the top of the email: "I thought of you for this because [specific reason from freewrite]". Skip if freewrite was thin.
- **Dispatch log:** append to `docs/rollouts/2026-04-alpha-cohort-1.md` with date/time of each send.

**Patterns to follow:**
- `src/routes/api/invites/+server.ts` — admin-gated POST, idempotent on email (so resending a stuck invite just re-emails the existing token).
- `src/lib/copy.ts` `copy.email.inviteSubject` and the HTML body in the POST handler — keep the voice.

**Test scenarios:**
- Integration — first dispatch of the week actually produces an invitation email in Resend's dashboard AND a `used_at IS NULL` row in `invitations` table. (Already verified in Unit 1 but re-check on the first real send.)
- Edge case — a tester who is already on the waitlist AND has an active invite (from Unit 1 or Unit 2 smoke testing) gets re-sent the same token, not a duplicate row. Idempotency is already in the endpoint; confirm.
- Edge case — a tester's email bounces (typo, spam-blocked). Detect via Resend dashboard; follow up via a secondary channel (freewrite or signup metadata) or drop them and pick a backup.

**Verification:**
- 8 invitations dispatched over 5 business days.
- Dispatch log in `docs/rollouts/2026-04-alpha-cohort-1.md` shows date, time, recipient initials per send.
- At least 4 testers have logged in at least once by end of week 1.

---

- [ ] **Unit 5: Feedback watch + triage cadence**

**Goal:** A written, checkable routine for watching `/admin/feedback`, the reply-to mailbox, and the database for signs of life or breakage. Ensures no tester gets stuck on something the team could have seen.

**Requirements:** R5

**Dependencies:** Unit 4 starts to fire

**Files:**
- Modify: `docs/rollouts/2026-04-alpha-cohort-1.md` — add a "watch log" section where daily observations + triage decisions are recorded.
- Modify (if needed): `docs/ROADMAP.md` — add a "v0.1 alpha observations" subsection once week 1 ends.

**Approach:**
- **Daily (weekdays), ~5 minutes:**
  - Check `/admin/feedback` for new submissions.
  - Check the reply-to mailbox.
  - Spot-check Supabase `profiles` for new sign-ups from the cohort. If someone was invited 48h+ ago and hasn't signed up, a gentle follow-up ("did the email land?") is allowed — not a nudge to engage.
  - Spot-check `meetings` table — are any meetings actually being scheduled? Absence of any scheduling by end of week 1 is a signal the discovery/matching surface isn't sparking.
- **Weekly digest, end of week 1 and week 2:** 300-word written summary of what the data shows + what action items came out of it.
- **Triage protocol for in-app feedback:**
  - `report` type (content moderation) → same-day response mandatory.
  - `bug` type → file as GitHub issue within 24h, triage severity, fix or acknowledge.
  - `feature` / `other` → batch for the weekly digest, no individual response pressure.
- **What we're NOT doing:** nudges to come back, feature-announcement emails, onboarding followups. Per `docs/design/design-principles.md` this is the anti-engagement commitment. If a tester bounced, that's data, not a problem to solve by sending more email.

**Patterns to follow:**
- The triage severity rubric from `docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md`.

**Test scenarios:**
- Integration — a `bug` submission in `/admin/feedback` results in a GitHub issue within 24h of the submission. Verified by spot-checking the feedback table against the GitHub issues list at the week-1 digest.

**Verification:**
- `docs/rollouts/2026-04-alpha-cohort-1.md` carries a dated entry for every weekday of the rollout.
- A week-1 digest exists by end of business day 7 after the first dispatch.
- No feedback item from a real tester goes unread for more than 48 hours.

---

- [ ] **Unit 6: Exit criteria evaluation at week 2**

**Goal:** Formal go/no-go at end of week 2 with a one-page write-up covering whether to invite a second cohort, hold, or stop and patch.

**Requirements:** R6

**Dependencies:** Unit 5 (two weekly digests in hand)

**Files:**
- Create: `docs/rollouts/2026-04-alpha-cohort-1-retro.md` — one-page retrospective using the exit-criteria frame below.

**Approach:**
- **Green signal (invite next cohort):** 4+ testers completed the full journey (wrote or responded to a conversation, scheduled a meeting, met, submitted post-meeting feedback, got feedback revealed). Zero P0s outstanding in `/admin/feedback`. No silent bounces beyond the ~30% inbox-attrition we should assume.
- **Yellow signal (hold, patch, retest same cohort):** 1–3 completed the journey, with named blockers we can fix in <1 week. No P0 outstanding; some P1s worth batching.
- **Red signal (stop, rework):** 0 completed journeys, OR a P0 hit that affects data integrity / privacy, OR a clear pattern of bounces at a specific surface (onboarding, discover, invitation).
- Write the one-pager with: hard numbers (counts per signal), qualitative summary (what testers said in their own words), decision (next action), timeline (when).

**Patterns to follow:**
- Same one-pager shape used in `docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md`'s triage table — counts, named issues, decisions.

**Test scenarios:**
- Not applicable — this is a written deliverable, not code.

**Verification:**
- `docs/rollouts/2026-04-alpha-cohort-1-retro.md` exists by end of business day 14 after the first dispatch.
- Decision section names exactly one of: green / yellow / red.
- Linked as "v0.1 alpha observations" in `docs/ROADMAP.md`.

## System-Wide Impact

- **Interaction graph:** Unit 4 dispatching real emails puts the existing infrastructure (Resend, Cloudflare Pages, Supabase RLS on `invitations` + `profiles`) into live use. Any latent bug in those layers becomes visible for the first time.
- **Error propagation:** A failed invite email is the riskiest silent failure — it bounces without triggering any user-visible error, and the tester simply never appears. Unit 1's Resend-dashboard check + Unit 5's "did they log in within 48h" spot-check together cover this.
- **State lifecycle risks:** Testers who bounce mid-join (received invite, clicked link, didn't complete) leave a consumed invite in the `invitations` table but no `profiles` row. The existing `/join` resumable-token design (Story 001) handles this; re-confirm in Unit 2.
- **API surface parity:** None new.
- **Integration coverage:** Unit 2's end-to-end smoke test is the only place the full real-world chain (waitlist → admin → Resend → inbox → /join → /discover) is exercised. Unit 1 covers the narrower "email actually goes out" slice.
- **Unchanged invariants:** The invite token lifetime (14 days), the admin gate (`app_metadata.role === 'admin'`), the idempotency on already-valid invites, and the Berlin-based checkbox in `/join` all stay exactly as they are today.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Email silently bounces on a tester's domain (spam filter, corporate MX). | Unit 1 verifies Resend delivery status at the source. Unit 5's "no sign-up after 48h" check catches individual bounces. Backup candidates available from the waitlist pool if one drops. |
| Cohort of 8 produces zero meetings — there are too few people to match. | Accepted as a valid experimental outcome. The red-signal path in Unit 6 covers it; next iteration would double the cohort or pre-seed a handful of conversations from the team. |
| Unit 4's personal-message wording feels invasive (we're citing their freewrite back). | Skip the personal sentence if it reads weird. Default invitation copy is already warm. |
| Testers hit a known P2 that we chose to ship anyway, then reply angrily. | Unit 4's invitation mentions "early alpha, rough edges, we want to hear what breaks". Sets the expectation upfront. |
| Feedback load exceeds weekday-5-min triage. | Escalation: raise triage to daily digest instead of daily-glance; if still overloading, pause cohort expansion and process backlog. |
| We accidentally invite someone non-Berlin. | The `/join` form has a Berlin checkbox that defaults on but can be unchecked; the app's core flows require showing up physically, which is a natural filter. Accept residual risk. |

## Documentation / Operational Notes

- **Pre-rollout checklist** (a human must tick all of these before Unit 4 fires):
  1. Unit 1 done — test email received at a burner from Resend production.
  2. Unit 2 done — end-to-end smoke test green.
  3. PR #120 merged to main (so the new `?` report type + migrate workflow and everything else is live).
  4. `/admin/waitlist` renders, admin role on the operator's account confirmed.
  5. Cohort list signed off (Unit 3).
  6. Reply-to mailbox for the invitation emails is monitored (Unit 5).
- **Rollout artefacts** all live under `docs/rollouts/`. Create the directory if it doesn't exist. Gitignore rule check: these docs should be tracked (waitlist + triage history is valuable), **but** redact real email addresses if the repo goes public at any point. Initials + last-4-of-email are sufficient for traceability.
- **After the alpha:** roll observations into the v0.2 plan in `docs/ROADMAP.md`. Archive `docs/rollouts/2026-04-alpha-cohort-1.md` under `docs/rollouts/archive/`.

## Sources & References

- **Playtest precedent:** [docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md](docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md)
- **First-touch flow spec:** [docs/stories/001-first-touch-to-registered-user.md](docs/stories/001-first-touch-to-registered-user.md)
- **Archetypes for selection:** [docs/design/user-archetypes.md](docs/design/user-archetypes.md)
- **Roadmap + v0.1 scope:** [docs/ROADMAP.md](docs/ROADMAP.md)
- **Design principles (anti-engagement, healthy brain):** [docs/design/design-principles.md](docs/design/design-principles.md)
- **Interop roadmap (selection-heuristic precedent):** [docs/plans/2026-04-17-feat-interop-roadmap-plan.md](docs/plans/2026-04-17-feat-interop-roadmap-plan.md)
- **Related code:** `src/lib/server/email.ts`, `src/routes/api/invites/+server.ts`, `src/routes/(admin)/admin/waitlist/+page.svelte`, `src/routes/(auth)/join/+page.svelte`, `src/routes/(auth)/waitlist/+page.svelte`
- **Related PRs shipped since the March playtest:** #107 (security), #109 (profile simplification), #111 (UX dead-ends), #117 (dark-mode fills), #119 (editor lazy-create), #120 (shared-infra foundations)
