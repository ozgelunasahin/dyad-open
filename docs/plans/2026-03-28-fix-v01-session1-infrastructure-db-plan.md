---
title: "fix: v0.1 Session 1 — Infrastructure + Database Fixes"
type: fix
status: active
date: 2026-03-28
origin: docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md
---

# v0.1 Session 1: Infrastructure + Database Fixes

Everything on remote is blocked until this session is done. No signup, no meetings, no email, no feedback.

(see brainstorm: `docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md` — Session 1)

## Items

### 1. Fix column names in code (B3) — no migration needed

Three wrong column names cause silent failures. Fix in code, not SQL.

- [ ] `src/routes/(app)/feedback/[id]/+page.server.ts:22` — change `user_a, user_b` → `participant_a, participant_b`
- [ ] `src/routes/(app)/+layout.server.ts:23` — change `.eq('user_id', ...)` → `.eq('reviewer_id', ...)`
- [ ] `src/routes/(app)/profile/+page.server.ts:70` — change `.eq('user_id', ...)` → `.eq('reviewer_id', ...)`
- [ ] Remove `?? 'TBD'` from `src/routes/(app)/profile/+page.svelte:109` — show actual null during alpha

### 2. Create combined signup RPC (B1) — new migration

`confirm_user_email` is revoked from `anon` and `authenticated`. The join flow calls it via anon client → 500 on every signup.

Create a single `consume_invitation_and_confirm(token, email)` SECURITY DEFINER function that:
- Validates the token (replaces `use_invitation`)
- Marks invitation as used
- Confirms the email (replaces `confirm_user_email`)
- Returns boolean success

Grant to `anon` only. Update `src/routes/join/+page.server.ts` to call this single RPC instead of the `Promise.all` of two RPCs.

- [ ] `supabase/migrations/2026XXXX_combined_signup_rpc.sql` — create function
- [ ] `src/routes/join/+page.server.ts` — replace `Promise.all([use_invitation, confirm_user_email])` with single RPC call
- [ ] Fix password frontend: `minlength={6}` → `8`, hint text → "At least 8 characters" (S3)

### 3. Fix accept_invitation RPC (B2) — new migration

Two problems in `supabase/migrations/20260331_extend_accept_with_meeting.sql`:

**a) 12-hour guard rejects valid acceptances.** Lines 47-52 expire the invitation if the slot starts within 12 hours. Per updated policy: users CAN accept up to start time. The 12h rule is cancellation-only.

**b) Meeting INSERT doesn't copy location data.** Lines 66-73 insert into `meetings` but omit `exact_location` and `general_area`. Every meeting has null location data.

- [ ] `supabase/migrations/2026XXXX_fix_accept_invitation.sql`:
  - Remove the 12-hour guard (lines 47-52 equivalent)
  - Add `exact_location, general_area` to the INSERT...SELECT from `time_slots`
- [ ] Verify: invitation expiry (`expire_stale_invitations`) uses slot start time as cutoff, not 12h before

### 4. Security SQL fixes (S1 + S2) — new migration

Ship with the migration batch.

- [ ] `supabase/migrations/2026XXXX_security_fixes.sql`:
  - Fix notifications INSERT policy: `WITH CHECK (auth.uid() = user_id)`
  - Restrict `archive_stale_prompts`: `REVOKE EXECUTE FROM public; GRANT EXECUTE TO service_role;`

### 5. Apply all migrations to remote Supabase (B5)

- [ ] Run `supabase db push --linked` or apply via SQL editor
- [ ] Verify: `uploads` bucket exists with RLS policies
- [ ] Verify: all RPC functions callable
- [ ] Verify: new combined signup RPC works
- [ ] Verify: `accept_invitation` copies location data

### 6. Enable pg_cron (B2) — remote config

- [ ] Enable `pg_cron` extension on remote Supabase (requires Pro plan — verify)
- [ ] Schedule `advance_scheduled_meetings()` — every 5 minutes
- [ ] Schedule `expire_stale_invitations()` — every hour
- [ ] Schedule `archive_stale_prompts()` — every hour
- [ ] Test: verify a past-start-time meeting transitions and creates feedback forms

### 7. Wire production email (B4)

- [ ] Pick EU email provider (Mailjet — EU data centre, sovereignty-aligned)
- [ ] Add conditional in `src/lib/server/email.ts` for Mailjet API format
- [ ] Set `EMAIL_API_URL`, `EMAIL_API_KEY`, `EMAIL_FROM` on Cloudflare Pages
- [ ] Fix email template image paths: relative → absolute (`https://dyad.berlin/images/logo-dark.png`)
- [ ] Fix invite email copy: "independent thinkers who meet through writing" → inclusive language
- [ ] Test: send a real invite email, verify delivery and rendering

### 8. Fix seed script + seed test data

- [ ] Fix slot insertion: use upsert or check for existing to prevent duplicates on re-run
- [ ] Seed two users in "met but haven't given feedback" state:
  - Create a meeting with `scheduled_time` in the past
  - Run `advance_scheduled_meetings()` manually (or wait for cron)
  - Verify feedback forms created with `state = 'due'`
  - Verify feedback gate blocks these users
- [ ] Add `(prompt_id, start_time)` unique constraint on `time_slots` to prevent duplicate slots

### 9. Set Cloudflare Pages environment variables

- [ ] `PUBLIC_SUPABASE_URL` — remote Supabase URL
- [ ] `PUBLIC_SUPABASE_ANON_KEY` — remote anon key
- [ ] `EMAIL_API_URL` — Mailjet API endpoint
- [ ] `EMAIL_API_KEY` — Mailjet API key
- [ ] `EMAIL_FROM` — `hello@dyad.berlin` (default, verify)

## Acceptance Criteria

- [ ] New user can sign up via `/join?token=...` on the deployed site
- [ ] Invite emails deliver to real addresses with correct links and images
- [ ] Accepted meetings have `general_area` and `exact_location` populated
- [ ] Meetings transition to `awaiting_feedback` automatically when start time passes
- [ ] Feedback forms created with `state = 'due'` for both participants
- [ ] Feedback gate blocks users with due feedback
- [ ] Attention badge shows correct count (feedback + invitations)
- [ ] Stale invitations expire at slot start time
- [ ] Stale prompts auto-archive when all slots expire
- [ ] `archive_stale_prompts` not callable by regular users
- [ ] Notification INSERT requires matching user_id
- [ ] No duplicate timeslots possible in the database
- [ ] Password minimum is 8 everywhere (join form + login reset)

## Technical Approach

**Migration order matters.** The new migrations must be applied in this order:
1. Combined signup RPC (B1)
2. Fixed accept_invitation (B2 — depends on existing schema)
3. Security fixes (S1 + S2)
4. Slot uniqueness constraint

Then push all at once to remote.

**Email adapter:** Add a simple conditional in `email.ts`:
```typescript
if (EMAIL_API_URL.includes('mailjet')) {
  // Mailjet v3.1 Send API format
} else {
  // Mailpit format (local dev)
}
```

Keep it simple — one provider for now, not a plugin system.

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md](docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md) — Session 1
- **Release readiness plan:** [docs/plans/2026-03-28-feat-v01-release-readiness-plan.md](docs/plans/2026-03-28-feat-v01-release-readiness-plan.md) — B1, B2, B3, B4, B5, S1, S2, S3
- **Column name bugs:** Architecture strategist agent findings
- **accept_invitation RPC:** `supabase/migrations/20260331_extend_accept_with_meeting.sql`
- **email.ts:** `src/lib/server/email.ts`
- **Sovereignty principle:** `docs/design/shared-infrastructure-opportunities.md` — EU email provider
