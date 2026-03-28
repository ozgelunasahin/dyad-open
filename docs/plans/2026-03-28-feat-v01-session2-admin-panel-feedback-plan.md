---
title: "feat: v0.1 Session 2 — Admin Panel + App Feedback"
type: feat
status: active
date: 2026-03-28
origin: docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md
---

# v0.1 Session 2: Admin Panel + App Feedback

The admin must be able to operate the alpha test without developer intervention. Testers need a way to report issues from within the app.

(see brainstorm: `docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md` — Session 2)

## Prerequisites from Session 1

PR #63 (`fix/v01-session1-infra-db`) delivers:
- **B3 done:** Column names fixed (`participant_a/b`, `reviewer_id`) — feedback page, layout badge, profile count all work
- **B1 done:** Signup flow fixed — `confirm_user_email` guarded with invitation check, sequential calls, password min 8
- **B2 done:** `accept_invitation` RPC rewritten — 12h guard removed, expiry at slot start time, `FOR UPDATE` locks
- **S1+S2 done:** Security fixes — `archive_stale_prompts` restricted to service_role, notifications INSERT policy fixed
- **Meeting general_area done:** `getMyMeetings` JOINs `time_slots` for `general_area`, `?? 'TBD'` removed
- **3 new migrations:** `20260404_security_fixes.sql`, `20260405_fix_accept_and_expiry.sql`, `20260406_fix_signup_flow.sql`
- **Login/join forms fixed:** `bind:value` for Playwright, `pressSequentially` in auth setup, password hints aligned

**Still pending in Session 1** (items 7-9 in the S1 plan): remote migration push, pg_cron/cron setup, PostHog project creation. These are deployment tasks — Session 2 code work can proceed in parallel on a separate branch.

## Architecture Decisions

### 1. Admin route group: separate from `(app)`, not inside it

Create `src/routes/(admin)/admin/` with its own `+layout.server.ts` and `+layout.svelte`. Reasons:
- Admin needs its own minimal layout (no sidebar, no FloatingNav — just a simple nav between admin pages)
- The `(app)` layout loads attention count, username, sidebar — unnecessary overhead for admin
- Separate layout group means the admin auth guard runs once in the layout, not per-page
- The `(admin)` SvelteKit group is invisible in the URL — users still see `/admin/waitlist`

### 2. Admin pages use the logged-in user's Supabase client + RLS policies

**Not** service-role. Reasons:
- `SUPABASE_SERVICE_ROLE_KEY` is not currently available in the SvelteKit server environment (only used in admin scripts)
- The `contacts` table already has an RLS policy for admin reads: `"Admins can view contacts"` checks `can_publish_sites` (baseline migration line 925)
- Follow the same pattern for new tables — consistent, auditable, no secret key in the app

**Exception:** Reading `feedback_forms.share_with_platform` requires a SECURITY DEFINER function because the column is REVOKE'd from `authenticated` (migration `20260401`, line 78). This is the only place we need to work around the column restriction.

### 3. Feedback gate bypass for admin users

Instead of adding individual path exemptions for every admin API call, bypass the gate entirely for `can_publish_sites` users. The admin must be able to operate the system even when they have due feedback — this is an operating constraint, not a convenience.

### 4. Reuse the legacy `feedback` table — don't create `app_feedback`

The baseline migration already has a `feedback` table (line 269) with: `id`, `user_id`, `type` (bug/feature/other), `description`, `context` (JSONB, max 10KB), `status` (new/reviewed/in_progress/resolved/wont_fix), `created_at`, `reviewed_at`, `notes`. This is almost exactly what B7 needs. The `canvas_id` column is nullable and can be ignored.

What it needs:
- A `page_url` column (ALTER TABLE ADD COLUMN) — cleaner than stuffing it into `context`
- A `user_agent` column — same reasoning
- RLS policies for admin reads and user inserts (RLS is enabled but no policies exist for it)

This avoids table proliferation and gives us the status workflow (new → reviewed → resolved) for free.

### 5. Config table: simple key-value with audit trail

```sql
config(key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW(), updated_by UUID REFERENCES auth.users(id))
```

Minimal but auditable. JSONB value handles booleans, strings, numbers without type columns.

## Items

### 1. Migration: extend `feedback` table + create `config` table + RLS + admin function

**File:** `supabase/migrations/20260407_admin_panel_tables.sql`

```sql
-- 1a. Extend legacy feedback table for app feedback use
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS page_url TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 1b. RLS policies for feedback table
-- Users can insert their own feedback
CREATE POLICY "Users insert own feedback"
  ON feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback
CREATE POLICY "Users read own feedback"
  ON feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all feedback
CREATE POLICY "Admins read all feedback"
  ON feedback FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.can_publish_sites = true
  ));

-- Admins can update feedback status
CREATE POLICY "Admins update feedback status"
  ON feedback FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.can_publish_sites = true
  ));

-- 1c. Config table
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'true'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read config (discover query needs this)
CREATE POLICY "Authenticated users read config"
  ON config FOR SELECT TO authenticated
  USING (true);

-- Only admins can write config
CREATE POLICY "Admins write config"
  ON config FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.can_publish_sites = true
  ));

-- Seed the first config flag
INSERT INTO config (key, value, updated_by)
VALUES ('show_fully_booked_conversations', 'true'::jsonb, NULL);

-- 1d. SECURITY DEFINER function to read platform feedback (column is REVOKE'd)
CREATE OR REPLACE FUNCTION get_platform_feedback()
RETURNS TABLE (
  form_id UUID,
  meeting_id UUID,
  reviewer_id UUID,
  reviewee_id UUID,
  share_with_platform TEXT,
  platform_comments TEXT,
  submitted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only callable by admins
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.can_publish_sites = true
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    ff.id AS form_id,
    ff.meeting_id,
    ff.reviewer_id,
    ff.reviewee_id,
    ff.share_with_platform,
    ff.platform_comments,
    ff.submitted_at
  FROM feedback_forms ff
  WHERE ff.share_with_platform IS NOT NULL
  ORDER BY ff.submitted_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_platform_feedback FROM public;
GRANT EXECUTE ON FUNCTION get_platform_feedback TO authenticated;
```

- [ ] Write migration file
- [ ] Run `supabase db reset` — verify all migrations apply cleanly

### 2. Extract `requireAdmin()` to shared module

**From:** `src/routes/api/invites/+server.ts:15-29` (inline)
**To:** `src/lib/server/auth.ts` (alongside existing `requireAuth`)

```typescript
export async function requireAdmin(locals: App.Locals) {
  if (!locals.user) error(401, 'Authentication required');
  const { data: profile } = await locals.supabase
    .from('profiles')
    .select('can_publish_sites')
    .eq('id', locals.user.id)
    .single();
  if (!profile?.can_publish_sites) error(403, 'Admin access required');
}
```

- [ ] Add `requireAdmin` to `src/lib/server/auth.ts`
- [ ] Update `src/routes/api/invites/+server.ts` to import from `$lib/server/auth.js`
- [ ] Remove the inline `requireAdmin` from invites

### 3. Feedback gate bypass for admins

**File:** `src/hooks.server.ts`

After line 50 (`if (user) {`), before the exempt path check, add an admin bypass:

```typescript
if (user) {
  // Admins bypass the feedback gate — they must operate the system even when gated
  const { data: adminProfile } = await event.locals.supabase
    .from('profiles')
    .select('can_publish_sites')
    .eq('id', user.id)
    .single();

  if (adminProfile?.can_publish_sites) {
    return resolve(event);
  }

  const pathname = event.url.pathname;
  // ... existing exempt check
}
```

Also add `/api/feedback/app` to the existing exempt list — gated testers should still be able to submit bug reports (that's when they're most likely to hit bugs).

- [ ] Add admin bypass in `hooks.server.ts`
- [ ] Add `/api/feedback/app` to exempt list
- [ ] Test: gated admin can access `/admin`, `/discover`, `/api/invites`
- [ ] Test: gated non-admin still redirected to feedback form

### 4. Admin route group — layout + auth guard

**Files to create:**

```
src/routes/(admin)/admin/
  +layout.server.ts    — admin auth guard (redirect non-admins to /discover)
  +layout.svelte       — minimal admin layout with sub-nav
  +page.server.ts      — redirect /admin → /admin/waitlist
```

**`+layout.server.ts`:**
```typescript
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, '/login');

  const { data: profile } = await locals.supabase
    .from('profiles')
    .select('can_publish_sites')
    .eq('id', locals.user.id)
    .single();

  if (!profile?.can_publish_sites) redirect(302, '/discover');

  return { isAdmin: true };
};
```

**`+layout.svelte`:**
Minimal layout with:
- dyad logo (link to /discover)
- Sub-nav tabs: Waitlist | Feedback | Settings
- Active tab highlighting using `$page.url.pathname`
- "← Back to app" link
- No sidebar, no FloatingNav — admin is a separate shell

**`+page.server.ts`:**
```typescript
import { redirect } from '@sveltejs/kit';
export const load = () => { redirect(302, '/admin/waitlist'); };
```

- [ ] Create admin layout server with auth guard
- [ ] Create admin layout svelte with sub-nav
- [ ] Create admin index redirect to waitlist
- [ ] Test: non-admin visiting `/admin` redirected to `/discover`

### 5. Admin waitlist page (B8)

**Files:** `src/routes/(admin)/admin/waitlist/+page.server.ts` + `+page.svelte`

**Server loader:**
- Query `contacts` table (RLS allows admin reads via existing policy)
- LEFT JOIN with `invitations` on email to determine status:
  - No invitation row → "Not invited"
  - Invitation exists, `used_at` IS NOT NULL → "Signed up"
  - Invitation exists, `used_at` IS NULL, `expires_at > NOW()` → "Invited (pending)"
  - Invitation exists, `used_at` IS NULL, `expires_at <= NOW()` → "Invitation expired"
- Sort by `created_at` DESC (newest first)
- Return all contacts with their status

**Note on the JOIN:** Supabase client can't do cross-table JOINs on tables without FK relationships. The `contacts` and `invitations` tables are linked by email but have no FK. Two approaches:
- **Option A:** Two parallel queries + client-side merge (simpler, works with Supabase client)
- **Option B:** Create a database view or RPC that does the JOIN server-side

Recommend **Option A** for simplicity: query all contacts, query all invitations, merge by email in the loader. At alpha scale (tens of contacts) this is fine.

**Page component:**
- Table/list view with columns: Name, Email, City, Freewrite (truncated), Date, Status, Action
- "Invite" button per row (visible only for "Not invited" and "Invitation expired" statuses)
- Button calls `POST /api/invites` with `{ email, name }` via `fetch`
- On success: show invite URL + update row status to "Invited (pending)"
- On `alreadyInvited: true`: show "Already has a valid invitation" message
- On 409: show "Already signed up" message
- Filter toggle: "Not yet invited" / "All"

- [ ] Create waitlist page server loader
- [ ] Create waitlist page component with table, invite button, filter
- [ ] Handle invite API responses (success, already invited, already signed up)
- [ ] Test: invite flow works end-to-end from admin panel

### 6. Admin feedback page (B8)

**Files:** `src/routes/(admin)/admin/feedback/+page.server.ts` + `+page.svelte`

**Server loader loads two sources:**

**Source A — App feedback (bug reports from testers):**
- Query `feedback` table (admin RLS policy grants access)
- JOIN with `profiles` on `user_id` to get username
- Select: id, user_id, type, description, page_url, user_agent, context, status, created_at

**Source B — Platform feedback (meeting feedback shared with platform):**
- Call `get_platform_feedback()` RPC (SECURITY DEFINER bypasses column REVOKE)
- JOIN with `profiles` on `reviewer_id` to get reviewer username
- JOIN with `meetings` on `meeting_id` to get meeting context (prompt_id, scheduled_time)

**Page component:**
- Two sections: "App Feedback" and "Platform Feedback" (tabs or accordion)
- App feedback: card per entry showing type badge (bug/feature/other), description, page URL, status badge, date, username
- Platform feedback: card per entry showing share_with_platform text, platform_comments, meeting date, reviewer username
- No triage actions in v0.1 — just viewing. Status updates can be added later.

- [ ] Create feedback page server loader (two data sources)
- [ ] Create feedback page component with two sections
- [ ] Test: app feedback entries appear after submission
- [ ] Test: platform feedback entries appear after meeting feedback with share_with_platform

### 7. Admin settings page (B8)

**Files:** `src/routes/(admin)/admin/settings/+page.server.ts` + `+page.svelte`

**Server loader:**
- Query `config` table for all rows
- Return as key-value map

**Page component:**
- Simple form with toggle switches for boolean flags
- First flag: `show_fully_booked_conversations` — toggle with label "Show fully booked conversations on discover"
- Save via form action (POST) — update config row, set `updated_at` and `updated_by`
- Show last updated timestamp per flag

**Form action:**
```typescript
export const actions = {
  default: async ({ request, locals }) => {
    // requireAdmin check
    const data = await request.formData();
    const key = data.get('key');
    const value = data.get('value') === 'true';
    await locals.supabase
      .from('config')
      .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: locals.user.id });
  }
};
```

- [ ] Create settings page server loader + form action
- [ ] Create settings page component with toggle
- [ ] Test: toggling flag persists and reads back correctly

### 8. App feedback button + modal (B7)

**File (new):** `src/lib/components/FeedbackModal.svelte`

**Modal component:**
- Triggered by a "Feedback" button
- Fields: free-text textarea (10-5000 chars), type selector (bug/feature/other, default "other")
- Auto-captures: `window.location.href` (page URL), `navigator.userAgent`, `window.__recentErrors` (error context from root layout collector)
- Submit via `fetch('POST', '/api/feedback/app')` — returns success/error
- On success: close modal, brief toast/confirmation
- Dismiss: click outside, Escape key, X button

**API endpoint (new):** `src/routes/api/feedback/app/+server.ts`

```typescript
import { json, error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth.js';

export const POST = async ({ request, locals }) => {
  requireAuth(locals.user);

  const body = await request.json();
  const { type, description, page_url, user_agent, context } = body;

  if (!description || typeof description !== 'string' || description.length < 10) {
    error(400, 'Feedback must be at least 10 characters');
  }

  const { error: dbError } = await locals.supabase
    .from('feedback')
    .insert({
      user_id: locals.user.id,
      type: ['bug', 'feature', 'other'].includes(type) ? type : 'other',
      description: description.slice(0, 5000),
      page_url,
      user_agent,
      context: context ?? {}
    });

  if (dbError) {
    console.error('[feedback/app] Insert failed:', dbError);
    error(500, 'Failed to submit feedback');
  }

  return json({ ok: true });
};
```

**Button placement:**
- **Desktop sidebar:** Add a "Feedback" link/button in `sidebar-bottom` section of `(app)/+layout.svelte` (above @username)
- **Mobile:** Add a feedback button to FloatingNav — but this conflicts with the Session 3 nav overhaul. **Simpler approach for v0.1:** place a small fixed "?" button in the bottom-right corner of the screen (outside FloatingNav), visible on all viewports. This survives Session 3's nav changes without rework.

- [ ] Create `FeedbackModal.svelte` component
- [ ] Create `POST /api/feedback/app` endpoint with validation
- [ ] Add feedback button to `(app)/+layout.svelte` sidebar (desktop)
- [ ] Add fixed "?" feedback trigger button (all viewports, outside FloatingNav)
- [ ] Test: submit feedback from app, verify it appears in admin feedback page

### 9. Wire config flag into discover query

**File:** `src/lib/services/prompt-query.ts` — `getPublishedPrompts()`

The discover page server loader reads the config flag and passes it to the service:

**Loader change** (`src/routes/(app)/discover/+page.server.ts`):
```typescript
// Read config flag
const { data: configRow } = await locals.supabase
  .from('config')
  .select('value')
  .eq('key', 'show_fully_booked_conversations')
  .single();
const showFullyBooked = configRow?.value ?? true;
// Pass to service
const prompts = await promptQueryService.getPublishedPrompts({ ..., showFullyBooked });
```

**Service change:** Add `showFullyBooked?: boolean` to the options parameter. When `false`, filter out prompts where all slots have `accepted = true`.

- [ ] Add `showFullyBooked` parameter to `getPublishedPrompts` interface
- [ ] Implement filtering in `SupabasePromptQueryService`
- [ ] Read config in discover loader and pass to service
- [ ] Test: toggle flag, verify discover results change

### 10. Add "Admin" link to sidebar (visible to admins only)

**File:** `src/routes/(app)/+layout.server.ts` — add `isAdmin` to returned data
**File:** `src/routes/(app)/+layout.svelte` — conditional admin link

The `(app)` layout already queries the profile for username. Extend it to also return `can_publish_sites`. Show an "Admin" link in the sidebar nav (between Profile and the bottom section) when true.

On mobile (where sidebar is hidden), the admin accesses `/admin` via direct URL or the fixed feedback "?" button could include an admin shortcut. At alpha scale, the admin knows to type `/admin` — this is functional, not polished.

- [ ] Return `isAdmin` from `(app)/+layout.server.ts`
- [ ] Add conditional "Admin" link in sidebar
- [ ] Test: admin user sees link, non-admin does not

## Internal Dependency Order

```
Item 1 (migration) ── gates items 5, 6, 7, 8, 9
Item 2 (extract requireAdmin) ── gates items 4, 8
Item 3 (gate bypass) ── independent, do early
Item 4 (admin layout) ── gates items 5, 6, 7
Items 5, 6, 7 (admin pages) ── can be parallelised after item 4
Item 8 (feedback button) ── independent of admin pages
Item 9 (config wire) ── needs item 7 (settings page) for testing
Item 10 (admin link) ── independent, can be done anytime
```

**Recommended order:** 1 → 2 → 3 → 4 → [5 + 6 + 7 in parallel] → 8 → 9 → 10

## Acceptance Criteria

- [ ] Admin can navigate to `/admin` and see waitlist, feedback, settings pages
- [ ] Non-admin visiting `/admin` is redirected to `/discover`
- [ ] Admin can view waitlist contacts with invited/not-invited/signed-up status
- [ ] Admin can click "Invite" and the user receives an email with join link
- [ ] Admin can view app feedback submitted by testers
- [ ] Admin can view platform feedback from meeting feedback forms
- [ ] Admin can toggle `show_fully_booked_conversations` flag
- [ ] Discover page respects the config flag
- [ ] Gated admin (with due feedback) can still access all admin pages and API calls
- [ ] Gated tester can submit app feedback via the "?" button
- [ ] Feedback button visible on all viewports (desktop and mobile)
- [ ] Feedback modal captures: text, type, page URL, user agent, recent errors
- [ ] All new tables have RLS enabled with appropriate policies
- [ ] `svelte-check --threshold error` passes (no new errors)
- [ ] All existing migrations + new migration apply cleanly on `supabase db reset`

## What This Session Does NOT Include

- **Email wiring (B4)** — deferred from Session 1, still deferred. Manual invite links via Slack/Signal for first testers.
- **Feedback triage workflow** — admin can view feedback but cannot mark items as reviewed/resolved from the UI. Status updates are a follow-up.
- **Admin on mobile** — admin link in sidebar only. Admin types `/admin` directly on mobile. FloatingNav admin shortcut deferred to Session 3 nav overhaul.
- **Pagination** — all admin pages load all rows. Fine at alpha scale.
- **Revealed feedback UI (B6)** — Session 4.
- **Navigation overhaul** — Session 3.

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md](docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md) — Session 2: "The admin needs to be able to operate without the developer."
- **Release readiness plan:** [docs/plans/2026-03-28-feat-v01-release-readiness-plan.md](docs/plans/2026-03-28-feat-v01-release-readiness-plan.md) — B7 (app feedback), B8 (admin panel)
- **Session 1 PR:** [PR #63](https://github.com/theodore-evans/dyad.berlin/pull/63) — infrastructure + DB fixes (prerequisite)
- **Session 1 plan:** [docs/plans/2026-03-28-fix-v01-session1-infrastructure-db-plan.md](docs/plans/2026-03-28-fix-v01-session1-infrastructure-db-plan.md) — deferred items (B4 email, seed fixes)
- **Existing admin pattern:** `src/routes/api/invites/+server.ts:15-29` — `requireAdmin()` using `can_publish_sites`
- **Contacts RLS:** `supabase/migrations/20260101_baseline.sql:925` — "Admins can view contacts" policy already exists
- **Column-level REVOKE:** `supabase/migrations/20260401_create_feedback_forms.sql:78` — `share_with_platform` hidden from `authenticated`
- **Legacy feedback table:** `supabase/migrations/20260101_baseline.sql:269-284` — reusable with minor extension
- **Feedback gate:** `src/hooks.server.ts:54-66` — exempt path list
- **Solution docs:** `docs/solutions/architecture/feedback-gate-middleware-pattern.md` (exempt list, fail-open, dual response), `docs/solutions/security-issues/rls-two-party-visibility-pattern.md` (admin policy pattern), `docs/solutions/security-issues/column-level-access-and-security-definer-patterns.md` (SECURITY DEFINER for hidden columns)
