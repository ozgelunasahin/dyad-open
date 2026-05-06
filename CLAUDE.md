# CLAUDE.md — Developer Guide

## Project Overview

dyad.berlin is a SvelteKit app for facilitating in-person conversations in Berlin. Members write conversation prompts, schedule meeting slots with locations, and meet strangers in person. The platform handles the full cycle: discover → respond → invite → meet → give feedback.

**Stack:** SvelteKit, Svelte 5 (runes), Supabase (auth + DB + storage), TipTap/ProseMirror (rich text editor), Leaflet (map), Cloudflare Pages.

**Domain vocabulary:** The internal model uses "prompt" for the written conversation starter. User-facing copy uses "conversation." See the *Domain language* section of `DESIGN.md` for the full mapping.

## Architecture

### Service Layer Pattern

All data access goes through typed service interfaces with Supabase implementations:

```
src/lib/services/
  identity.ts            # IdentityService — wraps the @prefig/upact port (load-bearing)
  prompt-command.ts      # PromptCommandService — create, update, publish, slots
  prompt-query.ts        # PromptQueryService — discover feed, detail, my prompts
  comment.ts             # CommentService — responses (called "comments" in DB)
  invitation.ts          # InvitationService — create, cancel, accept
  meeting.ts             # MeetingService — detail, cancel
  feedback.ts            # FeedbackService — form, submit, vocabulary
  gate.ts                # GateService — feedback gate check
  location.ts            # Location search via Nominatim (server-side)
  storage.ts             # StorageService — upload/serve cover images
  cancellation-query.ts  # Read-side queries for cancellations
```

Most services follow `interface XxxService` + `class SupabaseXxxService implements XxxService`. The exception is `identity.ts`, which is a thin functional module wrapping `@prefig/upact-supabase` — it's the boundary where the upact port is consumed.

Page server loaders call services directly (not via internal API fetches). The upact port is resolved in `hooks.server.ts` and `identity.ts`; the resulting substrate ID is passed to services as a plain `userId: string` parameter. Services do not see the `Upactor` abstraction. The test factory in `tests/helpers/db.ts` is the single swap point for portability.

### (app) Layout Group

All authenticated routes live under `src/routes/(app)/`. The layout provides:
- Auth guard (redirect to `/login` if not authenticated)
- Username loading from profiles
- Sidebar nav (Discover, Profile) + mobile hamburger

### Feedback Gate

`src/hooks.server.ts` checks every authenticated request for pending feedback forms. Gated members are redirected to `/feedback/{formId}`. Exempt paths: `/_app/`, `/feedback`, `/api/feedback`, `/api/auth`, `/api/vocabulary`, `/auth`, `/logout`, `/impressum`, `/datenschutz`, `.webmanifest`, `/service-worker`, `/favicon`.

### Key Patterns

- **Generation counter for async races**: Used in the prompt editor's auto-save (`saveGeneration`) and the MapView marker rebuilds. Prevents stale responses from corrupting state.
- **TipTap + Svelte 5**: Use `createSubscriber` from `svelte/reactivity` to bridge TipTap transactions into runes. Never call store methods directly from `onUpdate` — that path produces an infinite reactive loop.
- **Copy-on-write for reactivity**: Svelte 5 runes track by assignment. Any `Map` or `Set` mutation must create a new instance.
- **Response-first invitation flow**: Members must write a response before they can invite to meet. The response is the meeting context.

## Route Structure

```
/                      — Landing page (prompt previews for anon, redirect to /discover for auth)
/login                 — Login
/join                  — Registration via invite
/logout                — Logout
/waitlist              — Waitlist signup
/discover              — Conversation feed with map/list toggle (authenticated)
/conversations/new     — Create new conversation (draft)
/conversations/[id]    — Conversation detail (read, respond, invite)
/conversations/[id]/edit — Edit conversation (editor, scheduling, publish)
/profile               — My conversations + meetings
/meetings/[id]         — Meeting detail (location, cancel)
/feedback/[id]         — Feedback form (gated)
/impressum             — Legal notice
/datenschutz           — Privacy policy
/api/*                 — REST API endpoints

# Admin plane (admin.dyad.berlin)
/admin/waitlist        — Waitlist management
/admin/invites         — Invite management
/admin/conversations   — All conversations across all states; per-row show/hide on public discovery
/admin/feedback        — Feedback review
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (public, works with RLS) |
| `RESEND_API_KEY` | Yes | Email delivery (invites, notifications) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for admin plane) | Service-role client for the admin plane to access the user-tier database. |
| `ADMIN_DEV_BYPASS` | No (dev only) | Set to `1` in `.env.local` to allow `/admin/*` through without Cloudflare Access. Has no effect in production builds. |
| `PUBLIC_ASSET_BASE_URL` | No | Override for static page imagery (e.g. `/why` hero images). Falls back to the default Supabase uploads bucket. Set this to route assets through a sovereign host without touching code. |
| `PUBLIC_PLAUSIBLE_DOMAIN` | No | Plausible Analytics site domain (e.g. `dyad.berlin`). Enables the script tag in the public + authenticated app when set; the admin plane is always excluded. Unset = no analytics. |
| `PUBLIC_PLAUSIBLE_SCRIPT_SRC` | No | Override for the Plausible script URL. Defaults to `https://plausible.io/js/script.js`. Set this to point at a self-hosted Plausible instance. |
| `CF_ACCESS_TEAM_DOMAIN` | Yes (admin plane) | Cloudflare Zero Trust team domain, e.g. `dyad-berlin.cloudflareaccess.com`. Used to fetch the JWKS for verifying admin-plane JWTs. |
| `CF_ACCESS_AUD` | Yes (admin plane) | Per-application audience tag from the Cloudflare Access dashboard. Used to verify the `aud` claim on admin-plane JWTs. |

Admin authentication is gated by Cloudflare Access at the edge — operator identity lives in Cloudflare's identity layer, not in dyad. See `src/lib/server/admin-auth.ts` for the implementation and `SECURITY.md` for the threat model.

## Database

Schema defined in `supabase/migrations/` (source of truth). Key tables:
- `prompts` — Conversations with state machine (draft → published → archived)
- `time_slots` — Meeting slots with exact_location (private) and general_area (public)
- `prompt_comments` — Responses to conversations (one per user per prompt)
- `prompt_invitations` — Meeting invitations tied to slots
- `meetings` — Scheduled meetings between two members
- `feedback_forms` — Post-meeting feedback with simultaneous reveal
- `adjective_vocabulary` — Rating tags for feedback

## Key Files

- `src/lib/domain/types.ts` — All domain types (Prompt, TimeSlot, Comment, Meeting, etc.)
- `src/lib/domain/prompt.ts` — State machine guards (canPublish, canUnpublish, etc.)
- `src/lib/components/PromptEditor.svelte` — TipTap rich text editor with toolbar
- `src/lib/components/MapView.svelte` — Leaflet map with fuzzed pins, distance-sorted BottomSheet
- `src/lib/components/BottomSheet.svelte` — Map pin detail overlay
- `src/lib/components/SlotCard.svelte` — Reusable time slot card with hybrid timestamps
- `src/lib/components/FloatingNav.svelte` — Mobile navigation pill (discover + editor variants)
- `src/lib/utils/tiptap-html.ts` — Server-side TipTap JSON → sanitized HTML
- `src/lib/utils/dates.ts` — Hybrid date formatting (Today/Tomorrow/day name/date)
- `src/lib/utils/escape-html.ts` — HTML escaping for email templates
- `src/lib/server/validate-tiptap-content.ts` — TipTap JSON structure validation
- `src/hooks.server.ts` — Auth + feedback gate + /prompts/ → /conversations/ redirect

## Build Notes

- PWA workbox errors about oversized upload files are pre-existing and harmless.
- `svelte-check` has pre-existing errors (Supabase type widening).
- `DOMPurify` import: use `import DOMPurify from 'isomorphic-dompurify'` (default import).
- Leaflet CSS and icons self-hosted in `static/leaflet/`.

## Design References

- `DESIGN.md` — Consolidated design reference: philosophy, structural commitments (coordination not communication, calm technology, feedback gate, anti-sorting), domain language, visual system, components.

## Ways of Working

### For all contributors

1. **Always work on a branch, never commit directly to main.** Create a branch, make changes, push, create a PR, review, merge.

2. **Read before writing.** Always read the file you're about to change. Understand existing patterns before modifying them.

3. **Run `npx svelte-check --threshold error` before pushing.** This catches type errors and broken imports. Pre-existing errors are known — only worry about new ones.

   **Integration tests** against a real Supabase stack: `npm run test:integration:local`. The three tiers (unit / integration / E2E) and `.env.local` auto-generation from `supabase status` are covered in `CONTRIBUTING.md`.

4. **Commit messages follow conventional format.** `fix: description`, `feat: description`, `docs: description`, `refactor: description`. Keep them concise.

5. **For copy/wording changes:** Edit `src/lib/copy.ts`. Single source for all user-facing text.

6. **For CSS fixes:** Use design tokens from `src/app.css` (`--space-*`, `--text-*`, `--radius-*`). Don't hardcode pixel values. The full token catalogue is in `DESIGN.md`.

## Engineering Standards

The sections below codify operational standards for API contracts, security, migrations, and workflow. They exist because past code reviews surfaced these as the areas where problems actually occur.

### API Endpoint Standards

**Always return JSON from `/api/` routes.** SvelteKit's `error()` helper returns an HTML error page, not JSON. Use `return json({ error: '...' }, { status: N })` consistently.

**Wrap `request.json()` in try/catch.** Malformed input should return 400, not crash with 500:

```typescript
let body;
try {
    body = await request.json();
} catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
}
```

**Never return internal error details.** `error.message` from Supabase or Resend can contain table names, constraint names, and query fragments. Log server-side with `console.error`, return a generic message to the client.

**Validate the parsed body.** Check required fields are present and have the expected type before using them. Enforce length limits on user-generated content.

**Validate auth in every mutating endpoint.** Even when RLS is configured. RLS is the safety net; the API handler is the primary check.

**No `console.log` in server code.** Every log runs on every request on Cloudflare Workers. Use `console.error` for operational errors; remove debug `console.log` before committing.

### Security Boundaries

**`{@html}` opts out of XSS protection.** Every use requires manual sanitization. Any code that manually builds HTML for `{@html}` must route through DOMPurify or implement an explicit protocol allowlist (`http:`, `https:`, `mailto:` only).

**Never return debug/diagnostic data in API responses.** No API key lengths, no email delivery results, no Supabase error objects. Log server-side, return generic messages.

**Escape user input in HTML email templates.** User-supplied values interpolated into HTML email bodies must be HTML-escaped before interpolation.

### Database Migrations

**The repo is the source of truth. Never apply migrations directly to remote via the Supabase dashboard.** Every schema change lives in `supabase/migrations/` and reaches production through `supabase db push` from a merged PR. If you experiment in the dashboard SQL editor, copy the final SQL into a migration file and open a PR before anything becomes permanent. A diverged migration history is painful to recover (see the 20260415/20260416 incident).

**Before pushing migrations, run `supabase migration list`.** Local and remote columns should match row-for-row. Any `—` in the Local column means someone edited remote directly; stop and reconcile before pushing.

**Use full timestamp naming — `YYYYMMDDHHMMSS_name.sql`.** The tracker uses the version prefix as a primary key; the old `YYYYMMDD_name.sql` convention caps you at one migration per day and silently collides on the second push. Letter-suffix hacks like `20260401b_*.sql` are *skipped* by the CLI parser — do not use them.

**Every column referenced in code must have a migration, committed together.** If you add a column to an INSERT, the migration creating it must be in the same commit.

**After writing a rename migration, grep the codebase for the old name.** Column rename mismatches are silent in dev and catastrophic in production.

**One logical change per migration file.** This makes rollback possible at any point in the chain.

**RLS policies: INSERT should constrain the target, not just the actor.** A policy that only checks `auth.uid() IS NOT NULL` lets any authenticated user write rows targeting any other user.

**Prefer `app.current_user_id()` over `auth.uid()` in new RLS policies and SECURITY DEFINER functions.** The wrapper (defined in `supabase/migrations/20260418120000_add_app_current_user_id.sql`) delegates to `auth.uid()` today; when we move off Supabase Auth, we rewrite one function body instead of every policy. Existing `auth.uid()` call sites stay put until the surrounding policy is touched for other reasons — no bulk rewrite.

### Data Collection and Values

**If a new data use would need to be disclosed in `/datenschutz`, treat that as a strong signal to reconsider collecting it at all.** The Datenschutz page is our honest record of what we do with people's data. Every addition to it is a surface we commit to maintaining — consent flows, retention policy, Art 30 records, possibly cross-border transfer paperwork. Before adding a disclosure, ask: do we need this data, or can we achieve the same goal by pointing users at a third party that acts as the controller themselves? Example: newsletter collection was removed (migration 20260417110000_drop_newsletter_subscribers.sql) because pointing users at a Substack signup directly makes Substack the controller — we don't touch the email. Same outcome, no GDPR surface on our side.

**If a feature would require a GDPR / ePrivacy consent banner for visitors, treat that as a hard signal not to ship it as designed.** Cookies set before consent, third-party trackers, embedded third-party assets that observe visitors (Google Fonts, Mapbox, YouTube/Twitter embeds), and analytics that require consent all share a common shape: they push the data-handling boundary outward. The architectural posture of dyad — privacy port, payment opacity, calm-tech use shape — depends on that boundary staying tight. The consent banner is the visible evidence of drift; refusing to add the banner is how the drift is structurally prevented. Examples in the current stack: Plausible (cookieless, EU-hosted) is fine; Google Analytics would not be. Self-hosted Leaflet tiles instead of an embedded Mapbox/Google Maps widget. Self-hosted SangBleu Sunrise fonts instead of Google Fonts. Stripe Checkout (full-page redirect that satisfies Stripe's own privacy disclosure) instead of an embedded Stripe Element that observes visitors before consent. If a feature only works via a consent-requiring path, find a consent-free alternative or skip it. See `DESIGN.md` § *Consent-free as a constraint* for the design-level statement.

### Constants and Configuration

**Values that appear in more than one place must be constants.** Create them in `src/lib/domain/types.ts` or a dedicated constants file.

**No hardcoded dates, deadlines, or time-based content as string literals.** Use a configuration file or compute dynamically.

### Performance Patterns

**If async operations are independent, run them in parallel.** Use `Promise.all([query1, query2])` instead of sequential `await`. Each Supabase round trip adds 30–80ms.

### Code Organization

**Extract after the third copy.** If you're writing the same function a third time, extract it to `$lib/utils/`.

**Keep components under ~500 lines.** When a component handles multiple concerns, split using SvelteKit route groups or extract child components.

### Git Workflow

**Work on feature branches, not main.** Even without human reviewers, feature branches provide a clean rollback point.

**One logical change per commit.** Small, focused commits are the undo button for production problems.

**Run `npm run build` before pushing.** The build catches type errors, missing imports, and broken references that `svelte-check` may miss.

**Never force-push to main.** Use `git revert` to undo commits on main.

### Self-Review Checklist

```
- [ ] On the correct branch (not main) — `git branch` to verify
- [ ] Every `request.json()` wrapped in try/catch
- [ ] No `error.message` or internal details in API responses
- [ ] No `{@html}` without protocol-safe sanitization
- [ ] User input in email templates is HTML-escaped
- [ ] Every new column has a migration in the same commit; renames grepped
- [ ] Auth checked in every mutating API endpoint
- [ ] No duplicate logic (check if a utility already exists)
- [ ] No hardcoded values that appear elsewhere or will change
- [ ] No console.log in server code (console.error is fine)
- [ ] Independent async operations use Promise.all
- [ ] Build passes (`npm run build`)
- [ ] PR created with summary and test plan
```
