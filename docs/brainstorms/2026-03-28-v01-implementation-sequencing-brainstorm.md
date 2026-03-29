---
topic: v0.1 implementation sequencing — blockers, should-fix, and work sessions
date: 2026-03-28
status: active
participants: digit, claude
updated: 2026-03-28T22:00:00
---

# v0.1 Implementation Sequencing

How to sequence the readiness plan work into implementation sessions, respecting dependencies and maximising unblocking.

**Source of truth for requirements:** `docs/plans/2026-03-28-feat-v01-release-readiness-plan.md`

## Session Status

| Session | Status | PR | Key deliverables |
|---------|--------|-----|-----------------|
| 1: Infrastructure + DB | **DONE** | #63 (merged) | Column fixes, signup RPC, accept_invitation, security SQL, migrations pushed to remote |
| 2: Admin Panel + Feedback | **DONE** | #64 (merged) | Admin panel (waitlist + feedback), app feedback button, gate bypass, app_metadata admin |
| 3a: Security + Navigation | **DONE** | #65 (merged) | time_slots RLS safeguarding, sidebar hidden, FloatingNav everywhere, sign-out moved |
| 3b: Core Pages + Polish | **IN PROGRESS** | #66 | Discover visibility, conversation detail UX, map distance, copy.ts, email fixes |
| 4: Feedback Reveal | **PLANNED** | — | Revealed feedback UI, RevealCard component, E2E feedback test |
| 5: Landing Page Redesign | **PLANNED** | — | Discover embed with map for anon visitors, waitlist + login modals |
| Test Harness | **PLANNED** | — | Mobile Playwright tests, full lifecycle E2E. See `docs/plans/2026-03-28-feat-v01-test-harness-plan.md` |

## Corrections from Earlier Version

The original brainstorm was modified by a simplicity reviewer that cut explicit user requirements. These have been reinstated (see readiness plan "Reinstated" section):

1. **copy.ts is v0.1 scope** — created, needs wiring into components. Co-founder needs centrally manageable copy.
2. **Landing page discover embed with map + waitlist modal is v0.1** — needs its own session/PR (Session 5).
3. **Progressive slot disclosure is v0.1** — teaser before response, full slots after.
4. **Mobile Playwright tests are v0.1** — see test harness plan.
5. **NEVER use browser `confirm()`** — all confirmations must be in-app `<dialog>`. The simplicity reviewer recommended `confirm()` for alpha — this was rejected.
6. **Session 1 corrections:** `accept_invitation` does NOT copy location columns (meetings table doesn't have them — location accessed via JOIN). Combined signup RPC was overengineered — used guarded `confirm_user_email` instead.
7. **Session 2 corrections:** Admin identity uses `app_metadata` (not `can_publish_sites`). Config table dropped (hardcode for alpha). Reused legacy `feedback` table instead of new `app_feedback` table.

## Remaining Work

### Session 3b (in progress — PR #66)

Remaining items not yet committed:
- [ ] Wire copy.ts into components (replace hardcoded strings)
- [ ] Replace `confirm()` in archive button with `<dialog>` component
- [ ] Cancel meeting notification migration + RPC modification
- [ ] Profile: cancelled meetings in attention section
- [ ] Editor placeholder text
- [ ] Progressive slot disclosure (teaser before response)
- [ ] Responsive audit

### Session 4a: Feedback Reveal

Plan: `docs/plans/2026-03-28-fix-v01-session4-feedback-reveal-plan.md`
- Feedback page: fix step initialization for locked/submitted states
- Inline reveal after both submit (PATCH returns revealed data)
- Meeting detail: revealed feedback section + awaiting_feedback status

Items moved out of Session 4:
- Sidebar "New conversation" link → UI polish pass
- E2E feedback test → test harness plan
- Security hardening (error sanitization, RLS UPDATE policy) → standalone security PR

### Session 5: Landing Page Redesign (NEW)

Not yet planned. Scope:
- Embed discover view (map + list toggle) on right side of landing page for anonymous visitors
- All pin/card clicks open waitlist modal (not navigate)
- Waitlist form as modal (reuse fields from /waitlist)
- Login as modal with "Already have an account?" toggle
- "Private beta" label
- Reuse existing MapView, BottomSheet, getPublishedPromptsPublic()

### Test Harness

Plan: `docs/plans/2026-03-28-feat-v01-test-harness-plan.md`
- Mobile viewport Playwright tests (375px)
- Desktop Playwright tests (1280px)
- Full lifecycle E2E (respond → invite → accept → meeting → feedback → reveal)
- Seed data covers all states (6 users, see supabase/seed.sql)

### Infrastructure (not yet done)

- [ ] pg_cron or Cloudflare cron for `advance_scheduled_meetings`, `expire_stale_invitations`, `archive_stale_prompts`
- [ ] Production email wiring (Mailjet, deferred from Session 1)
- [ ] PostHog EU project created (infra ready, not wired)
- [ ] RBAC on production Supabase (restrict migration push before real user data)
- [ ] Set admin app_metadata on remote

## What Can a Co-Founder Do With Claude Code?

- **Copy changes** via `src/lib/copy.ts` — single file, all user-facing strings
- **CSS fixes** — spacing, colours, using design tokens from `src/app.css`
- **Admin operations** — `/admin/waitlist` (invite users), `/admin/feedback` (view reports)
- **Bug reports** — use the "?" feedback button in the app
- **CLAUDE.md** has ways of working section specifically for this

## Key Principles

1. **Infrastructure first.** Nothing works without migrations on remote.
2. **Admin before testers.** Admin must be able to operate unattended.
3. **Never use browser `confirm()`.** All confirmations in-app with `<dialog>`.
4. **No defensive fallbacks.** Show actual nulls during alpha — bugs must surface.
5. **Simplify HOW, never cut WHAT.** If the user stated a requirement, it ships.
6. **Copy in copy.ts.** All user-facing strings centralized for co-founder access.
7. **One plan per PR.** Split large sessions into separate plans.
