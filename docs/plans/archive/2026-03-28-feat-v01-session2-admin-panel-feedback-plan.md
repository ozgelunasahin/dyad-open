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

## Enhancement Summary

**Deepened on:** 2026-03-28
**Review agents used:** security-sentinel, architecture-strategist, code-simplicity-reviewer, performance-oracle, data-integrity-guardian, pattern-recognition-specialist, spec-flow-analyzer, best-practices-researcher, framework-docs-researcher, solution-docs-analyst

### Key Improvements from Review
1. **Admin flag moved to `app_metadata`** — eliminates privilege escalation via profile self-update (security-sentinel, spec-flow-analyzer)
2. **Gate bypass reordered** — admin check only runs when user IS gated, not on every request (performance-oracle, architecture-strategist, 3 other agents)
3. **Config table and settings page dropped** — hardcode the one boolean flag, revisit when there's a second (simplicity-reviewer)
4. **Platform feedback deferred** — no data exists yet, SECURITY DEFINER function removed (simplicity-reviewer)
5. **API endpoint follows codebase patterns** — `parseJsonBody`, `RequestHandler` type, `json()` error responses (pattern-recognition-specialist)
6. **Native `<dialog>` for feedback modal** — proper focus trapping, no portal needed (framework-docs-researcher)
7. **Feedback inputs sanitized** — length limits on page_url/user_agent, CHECK constraints in migration (security-sentinel)
8. **Duplicate INSERT policy handled** — baseline already has one, plan drops its own (data-integrity-guardian, architecture-strategist)
9. **Existing `/api/feedback` exemption covers new endpoint** — no additional exempt path needed (pattern-recognition-specialist)
10. **Contacts admin RLS uses `app_metadata`** — existing baseline policy must be updated (spec-flow-analyzer)

### Simplifications Applied
- Dropped: config table, settings page, SECURITY DEFINER function, platform feedback section, service interface changes for config (~330 LOC saved)
- Kept: waitlist with 3 states (not invited / invited / signed up — simplicity reviewer's 2 states loses useful info)

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

### 1. Admin identity: Supabase `app_metadata`, not a DB column

The legacy `can_publish_sites` column on `profiles` is vestigial (from the old canvas/sites feature). It's also a security risk: the "Users can update their own profile" RLS policy allows any user to set it to `true`, granting themselves admin privileges.

**Decision:** Use Supabase auth `app_metadata` for admin identity.

- Set once via service-role or Supabase dashboard: `{ "role": "admin" }`
- Check in RLS policies: `(SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`
- Check in SvelteKit loaders: `locals.user?.app_metadata?.role === 'admin'` (User.app_metadata is a required field — no need to go through session)
- **Cannot be modified by the client** — `app_metadata` is immutable from the user's side
- No column to protect, no RLS gymnastics, no privilege escalation vector
- The `can_publish_sites` column becomes dead code — existing uses migrated, column ignored

**Migration step:** Set `app_metadata` for the admin user(s) via Supabase dashboard or a one-time script:
```sql
UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE id = '<admin-user-id>';
```

**Update existing RLS policies:** The baseline's "Admins can view contacts" policy (line 925) checks `can_publish_sites`. Must be replaced with the `app_metadata` check.

### 2. Admin route group: separate from `(app)`, not inside it

Create `src/routes/(admin)/admin/` with its own `+layout.server.ts` and `+layout.svelte`. Reasons:
- Admin needs its own minimal layout (no sidebar, no FloatingNav — just a simple nav between admin pages)
- The `(app)` layout loads attention count, username, sidebar — unnecessary overhead for admin
- Separate layout group means the admin auth guard runs once in the layout, not per-page
- The `(admin)` SvelteKit group is invisible in the URL — users still see `/admin/waitlist`
- Follows the precedent set by the existing `(editor)` route group

### 3. Admin pages use the logged-in user's Supabase client + RLS policies

**Not** service-role. Reasons:
- `SUPABASE_SERVICE_ROLE_KEY` is not currently available in the SvelteKit server environment (only used in admin scripts)
- The `contacts` table already has an admin RLS policy (baseline migration line 925) — just needs updating to use `app_metadata`
- Follow the same pattern for new tables — consistent, auditable, no secret key in the app

### 4. Feedback gate bypass: only when gated, not on every request

The admin must be able to operate the system even when they have due feedback. But checking admin status on every request wastes a DB round trip for all non-admin users.

**Approach (from performance-oracle, architecture-strategist, 3 other agents):** Check admin status ONLY when the gate would actually block:

```
if (user && !isExempt) {
  check gate → if gated → check admin → if admin, bypass
}
```

This means: zero overhead for exempt paths, zero overhead for non-gated users, one extra query only when a user IS gated AND we need to know if they're admin.

### 5. Reuse the legacy `feedback` table — don't create `app_feedback`

The baseline migration already has a `feedback` table (line 269) with: `id`, `user_id`, `type` (bug/feature/other), `description`, `context` (JSONB, max 10KB), `status` (new/reviewed/in_progress/resolved/wont_fix), `created_at`, `reviewed_at`, `notes`. This is almost exactly what B7 needs. The `canvas_id` column is nullable and can be ignored.

Store `page_url` and `user_agent` in the existing `context` JSONB column (simplicity-reviewer recommendation). No schema change needed for the feedback table itself — just add RLS policies.

**Existing CHECK constraints work:** `description` 10-5000 chars, `type` in (bug/feature/other), `context` < 10KB. These match the app feedback use case.

### 6. No config table, no settings page

The simplicity reviewer correctly identified that building a generic config table + settings page + service interface changes for a single boolean flag (`show_fully_booked_conversations`) is overengineered for alpha. Hardcode `true` in the discover loader. If the admin needs to change it, one line of code + a Cloudflare Pages deploy (takes seconds). Revisit when there's a second flag.

### 7. No platform feedback section (defer)

No platform feedback data will exist at launch (no meetings have happened yet). The SECURITY DEFINER function and platform feedback section of the admin feedback page are removed. Build when there is actually data to display. The admin can check `share_with_platform` in the Supabase dashboard if needed before then.

### 8. No service layer for admin (intentional deviation)

Admin pages query Supabase directly in server loaders, bypassing the service interface pattern. This is acceptable because:
- Admin is a single-user concern at alpha scale
- Admin queries are read-heavy and straightforward (no complex domain logic)
- The service layer's value (testability, swap-ability) doesn't apply to admin at this stage

**Flagged for v0.2:** Extract to services when admin functionality expands.

**Exception:** The app feedback API endpoint (`POST /api/feedback/app`) IS user-facing and follows the existing endpoint patterns (`parseJsonBody`, `RequestHandler` type, `json()` error responses).

## Items

### 1. Migration: update admin RLS to use `app_metadata` + feedback policies

**File:** `supabase/migrations/20260408_admin_panel.sql`

(Note: `20260407` is taken by `20260407_drop_get_registered_emails.sql`)

```sql
-- 1a. Migrate ALL admin policies from can_publish_sites to app_metadata
-- Three policies in baseline use can_publish_sites: contacts (line 925), invitations (lines 913, 919)

DROP POLICY IF EXISTS "Admins can view contacts" ON contacts;
CREATE POLICY "Admins can view contacts"
  ON contacts FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can read invitations" ON invitations;
CREATE POLICY "Admins can read invitations"
  ON invitations FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 1b. RLS policies for feedback table
-- Note: RLS is already enabled (baseline line 1213)
-- Note: "Users can insert feedback" INSERT policy already exists (baseline line 1114)
-- Only add the missing policies:

-- Users can read their own feedback
CREATE POLICY "Users read own feedback"
  ON feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all feedback
CREATE POLICY "Admins read all feedback"
  ON feedback FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Note: no UPDATE policy needed yet — no triage UI in v0.1. Add when building triage workflow.

-- 1c. Add CHECK constraints for context fields used as page_url/user_agent
-- (Defense against oversized payloads — security-sentinel M2)
-- Not needed: the existing context JSONB has a 10KB CHECK constraint already
```

**Pre-migration step (manual, one-time):** Set admin `app_metadata` via Supabase dashboard:
```sql
UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = '<admin-email>';
```

**Important:** After setting `app_metadata`, the admin must log out and back in so a fresh JWT is issued with the new claim. The existing session JWT won't reflect the change until refreshed.

**Local dev:** Update `supabase/seed.sql` to set `role: admin` in lisa's `raw_app_meta_data` so local dev can test admin features.

- [ ] Set admin `app_metadata` via dashboard (+ log out/in)
- [ ] Write migration file
- [ ] Run `supabase db reset` — verify all migrations apply cleanly
- [ ] Verify: admin user can read contacts table via RLS

### 2. Helper: `isAdmin()` check from session

Not extracted as a shared `requireAdmin()` function (only 3 call sites, 1-2 lines each). Instead, a consistent inline pattern:

```typescript
// In layout server loads (redirect on failure):
const isAdmin = locals.user?.app_metadata?.role === 'admin';
if (!isAdmin) redirect(302, '/discover');

// In API endpoints (error on failure):
if (locals.user?.app_metadata?.role !== 'admin') error(403, 'Admin access required');
```

Also update the existing `requireAdmin()` in `src/routes/api/invites/+server.ts` to use `app_metadata` instead of querying `profiles.can_publish_sites`:

```typescript
async function requireAdmin(locals: App.Locals) {
  if (!locals.user) error(401, 'Authentication required');
  if (locals.user.app_metadata?.role !== 'admin') error(403, 'Admin access required');
}
```

This eliminates the profiles query entirely — admin status comes from `User.app_metadata`, populated at session load.

- [ ] Update `requireAdmin()` in `src/routes/api/invites/+server.ts` to use `app_metadata`
- [ ] Verify invite API still works for admin user

### 3. Feedback gate bypass for gated admins

**File:** `src/hooks.server.ts`

Reorder the gate logic so the admin check only fires when a user is actually gated (not on every request):

```typescript
if (user) {
  const pathname = event.url.pathname;

  const isExempt =
    pathname.startsWith('/_app/') ||
    pathname.startsWith('/feedback') ||
    pathname.startsWith('/api/feedback') ||  // already covers /api/feedback/app
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/vocabulary') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/logout') ||
    pathname.startsWith('/admin') ||          // NEW: admin always exempt
    pathname.endsWith('.webmanifest') ||
    pathname.startsWith('/service-worker') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/impressum') ||
    pathname.startsWith('/datenschutz');

  if (!isExempt) {
    const { SupabaseGateService } = await import('$lib/services/gate.js');
    const gateService = new SupabaseGateService(event.locals.supabase);
    const gateStatus = await gateService.checkGate(user.id);

    if (gateStatus.gated && gateStatus.feedbackFormId) {
      // Admin bypass: check app_metadata (no DB query needed)
      const isAdmin = event.locals.user?.app_metadata?.role === 'admin';
      if (isAdmin) {
        return resolve(event);
      }

      // Non-admin gated user: redirect/block
      if (pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'gated', feedbackFormId: gateStatus.feedbackFormId }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(null, {
        status: 303,
        headers: { Location: `/feedback/${gateStatus.feedbackFormId}` }
      });
    }
  }
}
```

**Key improvements over the original plan:**
- `/admin` added to exempt path list (admin panel always accessible)
- Admin check uses `app_metadata` from the JWT — **zero DB queries** for the admin bypass
- Admin check only runs when the user IS gated (rare condition)
- `/api/feedback/app` already covered by existing `/api/feedback` prefix — no additional exemption needed (pattern-recognition-specialist finding)

- [ ] Update gate logic in `hooks.server.ts`
- [ ] Test: gated admin can access `/admin`, `/discover`, `/api/invites`
- [ ] Test: gated non-admin still redirected to feedback form
- [ ] Test: non-gated users have zero additional overhead

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

  const isAdmin = locals.user?.app_metadata?.role === 'admin';
  if (!isAdmin) redirect(302, '/discover');

  return { isAdmin: true };
};
```

No profiles query needed — admin status is in the JWT.

**`+layout.svelte`:**
Minimal layout with:
- dyad logo (link to /discover)
- Sub-nav tabs: Waitlist | Feedback
- Active tab highlighting using `$page.url.pathname`
- "← Back to app" link
- No sidebar, no FloatingNav — admin is a separate shell
- Use existing design tokens (`--space-*`, `--text-*`) — no custom admin CSS

**`+page.server.ts`:**
```typescript
import { redirect } from '@sveltejs/kit';
export const load = () => { redirect(302, '/admin/waitlist'); };
```

- [ ] Create admin layout server with auth guard
- [ ] Create admin layout svelte with sub-nav (Waitlist | Feedback)
- [ ] Create admin index redirect to waitlist
- [ ] Test: non-admin visiting `/admin` redirected to `/discover`

### 5. Admin waitlist page (B8)

**Files:** `src/routes/(admin)/admin/waitlist/+page.server.ts` + `+page.svelte`

**Server loader:**
- Query `contacts` table (RLS allows admin reads via updated policy)
- Query `invitations` table in parallel
- Merge by email in the server loader to determine status:
  - No invitation row → "Not invited"
  - Invitation exists, `used_at` IS NOT NULL → "Signed up"
  - Invitation exists, `used_at` IS NULL → "Invited" (combine pending + expired — admin sees the date and can re-invite if expired)
- Sort by `created_at` DESC (newest first)

**Note on the JOIN:** `contacts` and `invitations` have no FK — use two parallel queries + server-side merge (documented pattern: `docs/solutions/architecture/missing-fk-workaround-parallel-lookups.md`).

**Page component:**
- Table/list view with columns: Name, Email, City, Freewrite (truncated), Date, Status, Action
- "Invite" button per row (visible for "Not invited" status; for "Invited" with expired invitation, show "Re-invite")
- Button calls `POST /api/invites` with `{ email, name }` via `fetch`
- On success: show invite URL (admin can share manually via Slack/Signal) + update row status
- On `alreadyInvited: true`: show "Already has a valid invitation" message
- On 409: show "Already signed up" message

- [ ] Create waitlist page server loader (two parallel queries, merge by email)
- [ ] Create waitlist page component with table, invite button
- [ ] Handle invite API responses (success, already invited, already signed up)
- [ ] Test: invite flow works end-to-end from admin panel

### 6. Admin feedback page (B8)

**Files:** `src/routes/(admin)/admin/feedback/+page.server.ts` + `+page.svelte`

**Server loader — app feedback only (platform feedback deferred):**
- Query `feedback` table (admin RLS policy grants access)
- Query `profiles` in parallel for user_id → username mapping (no FK, use the parallel lookup pattern)
- Select: id, user_id, type, description, context, status, created_at

**Page component:**
- Card per entry showing: type badge (bug/feature/other), description, page URL (from `context.page_url`), status badge, date, username
- No triage actions in v0.1 — just viewing

- [ ] Create feedback page server loader
- [ ] Create feedback page component
- [ ] Test: app feedback entries appear after submission

### 7. App feedback button + modal (B7)

**File (new):** `src/lib/components/FeedbackModal.svelte`

**Modal component using native `<dialog>` (framework-docs-researcher recommendation):**
- Triggered by a fixed "?" button in the bottom-right corner (all viewports, outside FloatingNav)
- Uses `<dialog>` element with `showModal()` for proper focus trapping and backdrop
- Fields: free-text textarea (10-5000 chars), type selector (bug/feature/other, default "bug")
- Auto-captures into `context` JSONB: `page_url` (window.location.href), `user_agent` (navigator.userAgent), `recent_errors` (from `window.__recentErrors` collector in root layout)
- Submit via `fetch('POST', '/api/feedback/app')`
- On success: close dialog, brief confirmation text
- Dismiss: click outside backdrop, Escape key, X button

```svelte
<!-- Pattern sketch -->
<script lang="ts">
  let dialog: HTMLDialogElement;
  let description = $state('');
  let type = $state<'bug' | 'feature' | 'other'>('bug');
  let submitting = $state(false);

  function open() {
    description = '';
    type = 'bug';
    dialog.showModal();
  }

  async function submit() {
    if (description.length < 10) return;
    submitting = true;
    const context = {
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      recent_errors: (window as any).__recentErrors ?? []
    };
    try {
      const res = await fetch('/api/feedback/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, description, context })
      });
      if (res.ok) dialog.close();
      // else: show error state
    } catch {
      // show error state
    } finally {
      submitting = false;
    }
  }
</script>

<button class="feedback-trigger" onclick={open} aria-label="Send feedback">?</button>

<dialog bind:this={dialog}>
  <!-- form content -->
</dialog>
```

**API endpoint (new):** `src/routes/api/feedback/app/+server.ts`

Follows codebase patterns (pattern-recognition-specialist findings):

```typescript
import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth.js';
import { parseJsonBody } from '$lib/server/parse-body.js';
import type { RequestHandler } from './$types';

interface AppFeedbackBody {
  type?: string;
  description?: string;
  context?: Record<string, unknown>;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireAuth(locals.user);
  const [body, errorResponse] = await parseJsonBody<AppFeedbackBody>(request);
  if (errorResponse) return errorResponse;

  const { type, description, context } = body;

  if (!description || typeof description !== 'string' || description.length < 10) {
    return json({ error: 'Feedback must be at least 10 characters' }, { status: 400 });
  }

  // Sanitize context fields (security-sentinel M2)
  const sanitizedContext: Record<string, unknown> = {};
  if (context && typeof context === 'object') {
    if (typeof context.page_url === 'string') sanitizedContext.page_url = context.page_url.slice(0, 2048);
    if (typeof context.user_agent === 'string') sanitizedContext.user_agent = context.user_agent.slice(0, 512);
    if (Array.isArray(context.recent_errors)) sanitizedContext.recent_errors = context.recent_errors.slice(0, 10);
  }

  const { error: dbError } = await locals.supabase
    .from('feedback')
    .insert({
      user_id: user.id,
      type: ['bug', 'feature', 'other'].includes(type ?? '') ? type : 'other',
      description: description.slice(0, 5000),
      context: sanitizedContext
    });

  if (dbError) {
    console.error('[feedback/app] Insert failed:', dbError);
    return json({ error: 'Failed to submit feedback' }, { status: 500 });
  }

  return json({ ok: true });
};
```

**Button placement:**
- Fixed "?" button in bottom-right corner, `position: fixed`, visible on all viewports
- Outside FloatingNav — survives Session 3's nav overhaul without rework
- Also add a "Feedback" link in the sidebar bottom section for desktop discoverability

- [ ] Create `FeedbackModal.svelte` component using native `<dialog>`
- [ ] Create `POST /api/feedback/app` endpoint with `parseJsonBody` + input sanitization
- [ ] Add fixed "?" feedback trigger button in `(app)/+layout.svelte`
- [ ] Add feedback link in sidebar bottom (desktop)
- [ ] Test: submit feedback from app, verify it appears in admin feedback page
- [ ] Test: gated user can still submit feedback (exempt path covers it)

### 8. Add "Admin" link to sidebar (visible to admins only)

**File:** `src/routes/(app)/+layout.server.ts` — return `isAdmin` from existing profile query
**File:** `src/routes/(app)/+layout.svelte` — conditional admin link

The `(app)` layout already queries the profile for username. Check `app_metadata` from the session (no additional query needed):

```typescript
// In (app)/+layout.server.ts
const isAdmin = locals.user?.app_metadata?.role === 'admin';
return { username: profile?.username ?? '', attentionCount, isAdmin };
```

Show an "Admin" link in the sidebar nav (between Profile and the bottom section) when `isAdmin` is true.

On mobile (where sidebar is hidden), the admin accesses `/admin` via direct URL. At alpha scale, the admin knows to type `/admin` — this is functional, not polished.

- [ ] Return `isAdmin` from `(app)/+layout.server.ts` (from session, no extra query)
- [ ] Add conditional "Admin" link in sidebar
- [ ] Test: admin user sees link, non-admin does not

## Internal Dependency Order

```
Item 1 (migration + app_metadata setup) ── gates items 5, 6, 7
Item 2 (update requireAdmin in invites) ── independent, do early
Item 3 (gate bypass) ── independent, do early
Item 4 (admin layout) ── gates items 5, 6
Items 5, 6 (admin pages) ── can be parallelised after item 4
Item 7 (feedback button) ── independent of admin pages, needs item 1 for RLS
Item 8 (admin link) ── independent, can be done anytime
```

**Recommended order:** [1 + 2 + 3 in parallel] → 4 → [5 + 6 + 7 in parallel] → 8

## Acceptance Criteria

- [ ] Admin can navigate to `/admin` and see waitlist and feedback pages
- [ ] Non-admin visiting `/admin` is redirected to `/discover`
- [ ] Admin can view waitlist contacts with invited/not-invited/signed-up status
- [ ] Admin can click "Invite" and the user receives an email with join link
- [ ] Admin can view app feedback submitted by testers
- [ ] Gated admin (with due feedback) can still access all admin pages and API calls
- [ ] Gated tester can submit app feedback via the "?" button
- [ ] Feedback button visible on all viewports (desktop and mobile)
- [ ] Feedback modal captures: text, type, page URL, user agent, recent errors (in context JSONB)
- [ ] Admin identity uses `app_metadata` (not `can_publish_sites`)
- [ ] `can_publish_sites` no longer used for any admin check
- [ ] All RLS policies use `app_metadata` admin check
- [ ] `svelte-check --threshold error` passes (no new errors)
- [ ] All existing migrations + new migration apply cleanly on `supabase db reset`

## What This Session Does NOT Include

- **Email wiring (B4)** — deferred from Session 1, still deferred. Manual invite links via Slack/Signal for first testers.
- **Config table / settings page** — hardcode `show_fully_booked_conversations = true`. Build config UI when there's a second flag.
- **Platform feedback viewing** — no meeting feedback data exists yet. Defer SECURITY DEFINER function + platform section until post-alpha.
- **Feedback triage workflow** — admin can view feedback but cannot mark items as reviewed/resolved from the UI.
- **Service interfaces for admin** — direct Supabase queries acceptable at alpha scale; extract to services when admin functionality expands.
- **Admin on mobile** — admin link in sidebar only. Admin types `/admin` directly on mobile.
- **Pagination** — all admin pages load all rows. Fine at alpha scale.
- **Revealed feedback UI (B6)** — Session 4.
- **Navigation overhaul** — Session 3.
- **Cleanup of `can_publish_sites` column** — leave in place, stop using. Remove in a future migration.

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md](docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md) — Session 2: "The admin needs to be able to operate without the developer."
- **Release readiness plan:** [docs/plans/2026-03-28-feat-v01-release-readiness-plan.md](docs/plans/2026-03-28-feat-v01-release-readiness-plan.md) — B7 (app feedback), B8 (admin panel)
- **Session 1 PR:** [PR #63](https://github.com/theodore-evans/dyad.berlin/pull/63) — infrastructure + DB fixes (prerequisite)
- **Session 1 plan:** [docs/plans/2026-03-28-fix-v01-session1-infrastructure-db-plan.md](docs/plans/2026-03-28-fix-v01-session1-infrastructure-db-plan.md) — deferred items (B4 email, seed fixes)

### Review Agent Findings Incorporated
- **Security sentinel:** Privilege escalation via `can_publish_sites` self-update → moved to `app_metadata`. Input sanitization on feedback endpoint. `FOR ALL` policy too broad.
- **Architecture strategist:** Reorder gate bypass for performance. Handle duplicate feedback INSERT policy. Separate `(admin)` group correct. Service layer deviation acceptable if documented.
- **Code simplicity reviewer:** Drop config table (one flag, hardcode). Drop platform feedback section (no data). Use context JSONB for page_url/user_agent. Keep requireAdmin inline.
- **Performance oracle:** Gate bypass must not add per-request query. Config PK lookup fine. RLS subqueries with `(SELECT ...)` wrapping perform well.
- **Data integrity guardian:** Seed INSERT needs ON CONFLICT (removed — no config table). Existing INSERT policy on feedback (don't duplicate). `'true'::jsonb` default misleading (removed — no config table).
- **Pattern recognition specialist:** API endpoint must use `parseJsonBody` + `RequestHandler` type + `json()` errors. `/api/feedback/app` already covered by existing exempt prefix.
- **Spec flow analyzer:** `can_publish_sites` self-update is privilege escalation. Gate bypass `return resolve()` skips nothing extra today. Cache admin flag on `event.locals` if needed.
- **Framework docs researcher:** `(admin)` route group coexists with `(app)`. Use native `<dialog>` for modals. Admin guard in layout.server.ts not hooks. `(SELECT auth.jwt()...)` wrapping for RLS performance.
- **Best practices researcher:** SvelteKit form actions for admin CRUD. `app_metadata` or `is_admin` column for admin identity. Layered auth: hooks for broad protection, layout for role check.
- **Solution docs:** feedback-gate-middleware-pattern (fail-open, exempt list), rls-two-party-visibility (OR semantics), missing-fk-workaround (parallel lookups), extract-inline-modals-to-routes (feedback modal is simple enough to stay inline), sveltekit-route-groups (layout isolation)
