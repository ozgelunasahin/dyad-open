---
topic: v0.1 implementation sequencing — blockers, should-fix, and work sessions
date: 2026-03-28
status: active
participants: digit, claude
---

# v0.1 Implementation Sequencing

How to sequence the readiness plan work into implementation sessions, respecting dependencies and maximising unblocking.

## The Work

**Source:** `docs/plans/2026-03-28-feat-v01-release-readiness-plan.md`

8 blockers (B1-B8), 2 promoted security fixes (S1-S2), and ~10 should-fix items. Plus documentation updates identified in the plan.

## Dependency Graph

```
B5 (apply migrations) ─── gates everything on remote
  │
  ├── B1 (fix confirm_user_email RPC) ─── gates signup
  │     └── needs new migration applied to remote
  │
  ├── B2 (pg_cron + accept_invitation fixes) ─── gates meeting lifecycle
  │     ├── fix accept_invitation: remove 12h guard, add general_area copy
  │     ├── enable pg_cron on remote Supabase
  │     └── needs migration + remote config
  │
  ├── B3 (fix column names) ─── gates feedback display + badge
  │     └── code-only fix, no migration needed
  │
  ├── S1 + S2 (security SQL) ─── ship with migration push
  │     └── one-line SQL fixes, bundle with B5
  │
  └── B4 (production email) ─── gates invite delivery
        ├── pick EU provider (Mailjet)
        ├── write adapter in email.ts
        └── set env vars on Cloudflare Pages

B6 (revealed feedback UI) ─── independent of above, but needs B2 working to test
B7 (app feedback button + table) ─── fully independent
B8 (admin panel) ─── depends on B7 (feedback table), otherwise independent
```

## Proposed Sessions

### Session 1: Infrastructure + Database Fixes

All the migration/SQL work in one batch. This is the foundation — nothing works on remote without it.

**Items:**
- B5: Apply all existing migrations to remote Supabase
- B1: Create combined `consume_invitation_and_confirm` RPC (new migration)
- B2: Fix `accept_invitation` RPC — remove 12h acceptance guard, add `exact_location` + `general_area` to INSERT
- B2: Enable pg_cron, create cron schedules for all 3 functions
- S1: Fix notifications INSERT policy (one-line SQL)
- S2: Restrict `archive_stale_prompts` to service_role (one-line SQL)
- B3: Fix column names (`participant_a/b`, `reviewer_id`) — code fix, no migration
- B4: Pick email provider, write adapter, set env vars
- Fix seed script (upsert for slots, don't create duplicates)
- Seed feedback-state test data (two users in "met but no feedback" state)

**Output:** Remote Supabase fully operational. Signup works. Meetings transition. Email delivers. Feedback gate activates.

**Can be parallelised:** B3 (code fix) can happen at the same time as the migration/SQL work.

### Session 2: Admin Panel + Feedback

The admin needs to be able to operate without the developer. This session builds the minimum viable admin.

**Items:**
- B7: Create `app_feedback` table + `POST /api/feedback/app` endpoint + feedback button in UI
- B8: `/admin` route group with auth guard + gate exemption
- B8: `/admin/waitlist` — list contacts, show invited/not-invited status, invite button
- B8: `/admin/feedback` — list app feedback + share-with-platform entries
- B8: `/admin/settings` — config flags (starting with `show_fully_booked_conversations`)

**Output:** Admin can approve waitlist, view feedback, toggle settings. All in-app.

### Session 3: Navigation + Frontend Polish

The navigation overhaul and the should-fix UX items from Ozge's feedback.

**Items:**
- Remove sidebar, FloatingNav everywhere (mobile + desktop)
- Profile button + notification badge on FloatingNav
- Sign out moved to profile page
- S3: Password min alignment (trivial)
- S12 copy changes: "Write a comment...", explainer text, invite email inclusive language, date labels, editor placeholder
- S12 conversation detail: spacing fix, invitation note as textarea, hide other slots after inviting, past-slot message
- S12 profile: meeting cancellation UI (in-app, not browser confirm), cancellation notification
- S12 editor: edit link on published conversation, archive button
- S12 discover: visibility policy (show own conversations, show with pending invitations, configurable fully-booked flag)
- S12 map: pin click by fuzz region not Bezirk, cover image consistency
- S12 responsive: mobile + large desktop audit

**Output:** Representative UX for alpha testers. Navigation works on all viewports.

### Session 4: Feedback Reveal + Final Polish

The core promise — simultaneous reveal — and remaining items.

**Items:**
- B6: Revealed feedback UI on meeting detail page (when meeting state is `completed`)
- B6: Inline reveal on feedback page when state is `locked`
- Remove `?? 'TBD'` and similar defensive fallbacks — show actual nulls during alpha
- S6: Verify new conversation button visible on all viewports
- Final E2E test run (manual, on phones)

**Output:** The full journey works end-to-end. Testers can give and see feedback.

## What Order Within Each Session?

Each session has its own internal dependency order noted in the items list. The sessions themselves are mostly sequential:

- **Session 1 first** — unblocks everything on remote
- **Session 2 next** — admin must work before inviting testers
- **Sessions 3 and 4 can overlap** — frontend polish and feedback reveal are independent

## What Needs Ozge's Input Before Implementation?

- **Navigation design:** FloatingNav layout on desktop — does she have a preference? Currently the discover variant is `[Map] [Calendar] [Search] [+]`. Adding profile + notification badge changes the layout.
- **Landing page:** The discover embed with map for anonymous visitors — is this v0.1 or can we ship with current cards + waitlist modal?
- **Copy:** All the placeholder text and guidance copy. Ideally she writes first drafts and we implement. Or we write, she reviews.

## What Can a Co-Founder Do With Claude Code?

During Sessions 1-2 (while developer builds infrastructure), the co-founder could work on:
- Writing all the copy (placeholder text, guidance, email templates) in a shared document
- Testing the admin panel once it's built (filing bugs via the feedback button)
- Manual mobile testing and noting layout issues

After Session 2, with Claude Code:
- Copy changes (once copy.ts exists or even directly in components)
- CSS spacing fixes
- Email template wording

## Open Questions

*None — sequencing is clear from the dependency graph. The question is how many sessions happen in one day vs spread across multiple.*

## Key Decisions

1. **Infrastructure first.** Nothing works without B5 + B1 + B2 + B4 on remote.
2. **Admin before testers.** B8 must be functional before inviting anyone.
3. **Frontend polish is the stretch.** Sessions 3-4 are important for representative UX but not blocking — testers can use a rougher UI if needed.
4. **Sessions 3 and 4 can interleave** — they're independent workstreams.
5. **Copy is a parallel workstream** — Ozge can write copy while developer builds infrastructure.
