---
title: "fix: v0.1 Session 1 — Infrastructure + Database Fixes"
type: fix
status: active
date: 2026-03-28
origin: docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md
---

# v0.1 Session 1: Infrastructure + Database Fixes

Everything on remote is blocked until this session is done. No signup, no meetings, no feedback.

Reviewed by: security-sentinel, architecture-strategist, code-simplicity-reviewer. Findings incorporated below.

(see brainstorm: `docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md` — Session 1)

## Items

### 1. Fix column names in code (B3) — no migration needed

Three wrong column names cause silent failures. Fix in code, not SQL.

- [ ] `src/routes/(app)/feedback/[id]/+page.server.ts:22` — change `user_a, user_b` → `participant_a, participant_b`
- [ ] `src/routes/(app)/+layout.server.ts:23` — change `.eq('user_id', ...)` → `.eq('reviewer_id', ...)`
- [ ] `src/routes/(app)/profile/+page.server.ts:70` — change `.eq('user_id', ...)` → `.eq('reviewer_id', ...)`
- [ ] Remove `?? 'TBD'` from `src/routes/(app)/profile/+page.svelte:109` — show actual null during alpha

### 2. Fix meeting `general_area` display — code fix, not schema change

**Review finding:** The `meetings` table does NOT have `exact_location` or `general_area` columns. The original plan was wrong — adding columns to the INSERT would have caused a failed migration. The `get_meeting_with_location` RPC already JOINs `time_slots` to get location data. The bug is that `getMyMeetings` in `MeetingService` does `select('*')` which returns no location data.

- [ ] Fix `MeetingService.getMyMeetings()` to use a relational query that includes `time_slots.general_area` (Supabase `.select('*, time_slots!inner(general_area)')` pattern, or a new lightweight RPC)
- [ ] Update the `Meeting` type or return type to include `general_area`

### 3. Fix signup flow (B1) — new migration + small code change

**Review finding:** A combined RPC is overengineered. Simpler: guard `confirm_user_email` to check a consumed invitation exists for that email, re-grant to `anon`, and change the `Promise.all` to sequential calls.

**Security requirement:** The function must look up the email from the invitation row (not accept it as a free parameter) to prevent confirming arbitrary emails. Use `FOR UPDATE` lock on the invitation.

- [ ] `supabase/migrations/20260404_fix_signup_flow.sql`:
  - `CREATE OR REPLACE FUNCTION confirm_user_email(user_email text)` — add guard: check that a consumed (`used_at IS NOT NULL`) invitation exists for this email before confirming. Use `FOR UPDATE` on the invitation row.
  - Re-grant to `anon`: `GRANT EXECUTE ON FUNCTION confirm_user_email(text) TO anon;`
- [ ] `src/routes/join/+page.server.ts:105` — change `Promise.all([use_invitation, confirm_user_email])` to sequential: `await use_invitation` then `await confirm_user_email`
- [ ] Fix password frontend: `minlength={6}` → `8`, hint text → "At least 8 characters"
- [ ] Also fix login password update: `src/routes/login/+page.server.ts` — verify minimum is 8

### 4. Fix accept_invitation RPC (B2) — new migration

Remove the 12-hour acceptance guard. Users CAN accept up to start time. The 12h rule is cancellation-only.

**Note:** The meetings table does NOT need location columns added. Location data is accessed via JOINs in existing RPCs.

**Accepted risk:** Late acceptance (e.g., 5 min before start) creates a meeting that may immediately transition to `awaiting_feedback` when the cron runs. The user experience for this edge case is acknowledged but acceptable for alpha.

- [ ] `supabase/migrations/20260405_fix_accept_and_expiry.sql`:
  - `CREATE OR REPLACE FUNCTION accept_invitation(...)` — remove lines 47-52 equivalent (the 12h guard that expires the invitation)
  - `CREATE OR REPLACE FUNCTION expire_stale_invitations()` — change `start_time - INTERVAL '12 hours' <= NOW()` to `start_time <= NOW()` (invitations expire at slot start time, not 12h before)

### 5. Security SQL fixes (S1 + S2) — deploy FIRST

**Review finding:** `archive_stale_prompts` is currently callable by `anon`. Deploy this REVOKE as the first migration in the batch.

- [ ] `supabase/migrations/20260404_security_fixes.sql` (numbered before other new migrations):
  - Restrict `archive_stale_prompts`: `REVOKE EXECUTE ON FUNCTION archive_stale_prompts FROM public; GRANT EXECUTE ON FUNCTION archive_stale_prompts TO service_role;`
  - Fix notifications INSERT policy: `DROP POLICY "Insert notifications for authenticated users" ON notifications; CREATE POLICY "Insert own notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);`

### 6. Local dry-run before pushing

**Review finding:** Verify the full migration chain applies cleanly before pushing to remote.

- [ ] Run `supabase db reset` locally — verify all migrations apply without errors
- [ ] Test signup flow locally
- [ ] Test accept invitation locally
- [ ] Verify feedback forms are created when `advance_scheduled_meetings()` is called manually

### 7. Apply all migrations to remote Supabase (B5)

- [ ] Push migrations to remote (order: security fixes first, then signup fix, then accept/expiry fix)
- [ ] Verify: `uploads` bucket exists with RLS policies
- [ ] Verify: all RPC functions callable
- [ ] Verify: signup flow works end-to-end on deployed site

### 8. Enable pg_cron or alternative (B2) — remote config

- [ ] Check if remote Supabase is on Pro plan (pg_cron requires Pro)
- [ ] **If Pro:** Enable `pg_cron`, schedule:
  - `advance_scheduled_meetings()` — every 5 minutes
  - `expire_stale_invitations()` — every hour
  - `archive_stale_prompts()` — every hour
- [ ] **If not Pro (fallback):** Create a Cloudflare Workers Cron Trigger that calls the three RPCs via Supabase REST API using the service role key. Schedule: same intervals.
- [ ] Test: verify a past-start-time meeting transitions and creates feedback forms

### 9. PostHog readiness (not wired yet, infra ready)

- [ ] Create PostHog project (EU cloud instance for sovereignty)
- [ ] Note the project key — will be wired in Session 2 or 3
- [ ] Ensure Cloudflare Pages can accept a `PUBLIC_POSTHOG_KEY` env var (just verify, don't set yet)

## Deferred to Session 1b or Session 2

These were in the original plan but are not blockers for getting the core flow working on remote:

- **Wire production email (B4)** — For the first few alpha testers, send invite links manually (Slack/Signal). Wire Mailjet in a follow-up session. When wiring: use `EMAIL_PROVIDER` env var (not URL sniffing), handle Mailjet Basic Auth (not Bearer), add `EMAIL_API_SECRET` for the two-key auth.
- **Seed script fixes** — `ON CONFLICT DO NOTHING` for slots. Do when needed.
- **Unique constraint on timeslots** — Seed script bug, not production bug. Defer.
- **Cloudflare env vars for email** — Defer with email wiring.

## Acceptance Criteria

- [ ] New user can sign up via `/join?token=...` on the deployed site
- [ ] Meetings transition to `awaiting_feedback` automatically when start time passes
- [ ] Feedback forms created with `state = 'due'` for both participants
- [ ] Feedback gate blocks users with due feedback
- [ ] Attention badge shows correct count (feedback + invitations)
- [ ] Meeting cards show `general_area` (not null/TBD)
- [ ] Stale invitations expire at slot start time (not 12h before)
- [ ] Stale prompts auto-archive when all slots expire
- [ ] `archive_stale_prompts` not callable by regular users
- [ ] Notification INSERT requires matching user_id
- [ ] Password minimum is 8 everywhere
- [ ] PostHog project created (EU cloud), key available for later wiring
- [ ] All migrations apply cleanly on local dry-run before remote push

## Technical Approach

**Migration files (date-ordered after existing `20260403`):**
1. `20260404_security_fixes.sql` — REVOKE archive function, fix notifications policy (deploy first)
2. `20260404_fix_signup_flow.sql` — guard + re-grant confirm_user_email
3. `20260405_fix_accept_and_expiry.sql` — remove 12h acceptance guard, fix expiry cutoff

**Local dry-run → remote push → cron setup → verify.**

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md](docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md) — Session 1
- **Release readiness plan:** [docs/plans/2026-03-28-feat-v01-release-readiness-plan.md](docs/plans/2026-03-28-feat-v01-release-readiness-plan.md) — B1, B2, B3, B5, S1, S2, S3
- **Review agents:** security-sentinel (token binding, expiry cutoff, email auth), architecture-strategist (meetings table schema, pg_cron fallback, migration ordering), code-simplicity-reviewer (combined RPC overengineered, location columns factual error, email deferral)
- **Column name bugs:** Architecture strategist + cross-checker agent findings
- **accept_invitation RPC:** `supabase/migrations/20260331_extend_accept_with_meeting.sql`
- **expire_stale_invitations:** `supabase/migrations/20260328_create_comments_invitations.sql:165-185`
