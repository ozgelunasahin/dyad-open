# CLAUDE.md — Developer Guide

## Project Overview

dyad.berlin is a SvelteKit app for facilitating in-person conversations in Berlin. Members write conversation prompts, schedule meeting slots with locations, and meet strangers in person. The platform handles the full cycle: discover → respond → invite → meet → give feedback.

**Stack:** SvelteKit, Svelte 5 (runes), Supabase (auth + DB + storage), TipTap/ProseMirror (rich text editor), Leaflet (map), Cloudflare Pages.

**Domain vocabulary:** The internal model uses "prompt" for the written conversation starter. User-facing copy uses "conversation." See the *Domain language* section below for the full mapping.

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
  scope.ts               # ScopeService — corner/scope CRUD + membership
  cancellation-query.ts  # Read-side queries for cancellations
```

Most services follow `interface XxxService` + `class SupabaseXxxService implements XxxService`. The exception is `identity.ts`, which is a thin functional module wrapping `@prefig/upact-supabase` — it's the boundary where the upact port is consumed.

The same port pattern applies to email at `src/lib/server/email-providers/`: an `EmailProvider` interface with `ResendEmailProvider`, `MailpitEmailProvider`, and `MigaduEmailProvider` adapters. `src/lib/server/email.ts` resolves an adapter from `EMAIL_PROVIDER` and exposes a single `sendEmail()` that callers use.

Page server loaders call services directly (not via internal API fetches). The upact port is resolved in `hooks.server.ts` and `identity.ts`; the resulting substrate ID is passed to services as a plain `userId: string` parameter. Services do not see the `Upactor` abstraction. The test factory in `tests/helpers/db.ts` is the single swap point for portability.

### Route groups

Most authenticated routes live under `src/routes/(app)/`. The conversation editor is its own group at `src/routes/(editor)/conversations/[id]/edit/`. The admin plane is at `src/routes/(admin)/admin/`. Auth flows (`login`, `signup`, `join`, `waitlist`) live in `src/routes/(auth)/`. The `(app)` layout provides the auth guard (redirect to `/login` if not authenticated) and loads the member's username from `profiles`.

Navigation is via `FloatingNav` on every page that needs it; there is no shared sidebar in the current implementation. `src/lib/components/Sidebar.svelte` exists as a draft component but is not mounted.

### Feedback Gate

`src/hooks.server.ts` checks every authenticated request for pending feedback forms. For page navigation it sets `event.locals.pendingFeedbackFormId`, and the `(app)` layout renders `MeetingFeedbackModal` over the page. For `/api/*` requests the gate returns a 403 JSON `{ error: 'gated' }`. Exempt paths: `/_app/`, `/feedback`, `/api/feedback`, `/api/auth`, `/api/vocabulary`, `/auth`, `/logout`, `/impressum`, `/datenschutz`, `.webmanifest`, `/service-worker`, `/favicon`.

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
/admin/members         — Per-member last-active timestamp (derived from app data; no auth.users access)
/admin/scopes          — Corner CRUD: create, list, retire scopes; grant/revoke memberships
/admin/scopes/[scope]  — Scope detail: members + last-active + grant/revoke
/admin/feedback        — Feedback review
/admin/settings        — Global runtime settings (currently: transactional email notifications kill switch)
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (public, works with RLS) |
| `EMAIL_PROVIDER` | No | Selects the email adapter: `mailpit` (default, local dev), `resend`, or `migadu`. See `src/lib/server/email-providers/`. |
| `RESEND_API_KEY` | When `EMAIL_PROVIDER=resend` | Resend API key. |
| `MIGADU_SMTP_HOST` / `MIGADU_SMTP_USER` / `MIGADU_SMTP_PASS` | When `EMAIL_PROVIDER=migadu` | Migadu SMTP credentials. Adapter is currently a stub — see `src/lib/server/email-providers/migadu.ts`. |
| `EMAIL_FROM` | No | Sender address. Default `hello@dyad.berlin`. |
| `EMAIL_API_URL` | No | Mailpit HTTP send URL. Default `http://localhost:54324/api/v1/send`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for admin plane) | Service-role client for the admin plane to access the user-tier database. |
| `ADMIN_DEV_BYPASS` | No (dev only) | Set to `1` in `.env.local` to allow `/admin/*` through without Cloudflare Access. Has no effect in production builds. |
| `PUBLIC_ASSET_BASE_URL` | No | Override for static page imagery (e.g. `/why` hero images). Falls back to the default Supabase uploads bucket. Set this to route assets through a sovereign host without touching code. |
| `PUBLIC_PLAUSIBLE_SCRIPT_SRC` | No | Plausible Analytics script URL with embedded site identifier (e.g. `https://plausible.io/js/pa-XXXXXXXX.js`). Copy from the Plausible dashboard's tracking-script snippet. Setting this enables the script tag in the public + authenticated app; the admin plane is always excluded. Unset = no analytics. |
| `PUBLIC_ZINE_PAYMENT_LINK_STANDARD` / `PUBLIC_ZINE_PAYMENT_LINK_REDUCED` / `PUBLIC_ZINE_PAYMENT_LINK_SUPPORTER` | No | Stripe **Payment Link** URLs (`https://buy.stripe.com/...`) for the `/zine` page, one per tier. Create each in the Stripe dashboard from a product/price (enable shipping-address collection for the physical item). The page links to them as full-page redirects — no embedded Stripe.js, consistent with the consent-free constraint. A tier renders only when its URL is set; with none set the page shows an "available soon" state. Tier names and descriptions are versioned in `src/routes/zine/+page.svelte`; prices live on the Stripe checkout page. |
| `CF_ACCESS_TEAM_DOMAIN` | Yes (admin plane) | Cloudflare Zero Trust team domain, e.g. `dyad-berlin.cloudflareaccess.com`. Used to fetch the JWKS for verifying admin-plane JWTs. |
| `CF_ACCESS_AUD` | Yes (admin plane) | Per-application audience tag from the Cloudflare Access dashboard. Used to verify the `aud` claim on admin-plane JWTs. |

Admin authentication is gated by Cloudflare Access at the edge — operator identity lives in Cloudflare's identity layer, not in dyad. See `src/lib/server/admin-auth.ts` for the implementation and `SECURITY.md` for the threat model.

## Database

Schema defined in `supabase/migrations/` (source of truth). Key tables:
- `prompts` — Conversations. Two states (`draft`, `published`); three actions (publish, unpublish, delete). See `DESIGN.md` § *Conversation states*.
- `time_slots` — Meeting slots with exact_location (private) and general_area (public)
- `prompt_comments` — Responses to conversations (one per user per prompt)
- `prompt_invitations` — Meeting invitations tied to slots
- `meetings` — Scheduled meetings between two members
- `feedback_forms` — Post-meeting feedback with simultaneous reveal
- `adjective_vocabulary` — Rating tags for feedback
- `app_settings` — Global runtime config (key/JSONB value). Service-role-only. Read/written by the admin plane (`/admin/settings`) and the notification dispatch gate. Default seed: `email_notifications_enabled = false`.

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
- TipTap → HTML rendering is in `src/lib/utils/tiptap-html.ts`. The renderer is safe-by-construction: a fixed tag/attribute allowlist plus a protocol allowlist (`http:`, `https:`, `mailto:`) for URLs. No runtime DOMPurify dependency.
- Leaflet CSS and icons self-hosted in `static/leaflet/`.

## Design References

- `DESIGN.md` — Dyad's structural commitments.
- Visual tokens live in `src/app.css`. Component implementations in `src/lib/components/`.

## Domain language

The internal model uses precise technical terms; user-facing copy uses everyday language. Members should never encounter domain vocabulary.

| Internal (code/API/DB) | User-facing | Notes |
|------------------------|-------------|-------|
| `prompt` | **conversation** | A "prompt" is the written starting point. A "conversation" is the whole flow — writing, meeting, talking. Members see "conversation" because that is the human experience. |
| `prompt_comments` (DB) / `comment` | **response** | Writing a response is intentional engagement with the conversation, not a casual comment. The response is the gateway to the invitation. |
| `time_slot` | **time** / **available time** | "Pick a time", not "select a slot". |
| `LocationRef` | **location** / **place** | Natural language. |
| `general_area` | **neighbourhood** | The area shown to the inviter before acceptance. |
| `exact_location` | **location** / **where to meet** | Only shown after acceptance. |
| `author_id` | **you** / **the author** | No IDs surfaced. |
| `body` (TipTap JSON) | *(not named)* | Members write; they don't "create a body". |
| `state: draft` | **draft** | Passes through as-is. |
| `state: published` | **published** / **live** | "Your conversation is live on the discover feed." |
| `feedback_form` | **feedback** | "How did it go?" not "complete your feedback form". |
| `meeting`, `invitation` | same | Pass through — natural words. |
| `region` | **city** / *(implicit)* | Berlin is implicit; don't force members to choose. |

**Boundary discipline.** Map domain → user-facing at the service/component boundary. A frontend component must never display raw API field names. Error messages from the API may surface domain words ("Failed to create prompt"); catch and rephrase at the UI layer.

**URL paths use `/conversations/`**; `/api/prompts/` retains the internal name.

## UI conventions

- **Placeholders are the guidance.** No tutorial modals, no persistent labels, no instruction paragraphs above form fields. Once a member types, the placeholder disappears. At key transition points a placeholder may describe what happens next; that is the guidance.
- **Onboarding is a 4-step modal** on the discover page. After that, members find their way through the interface itself.
- **Casing** — headings in Title Case, buttons and actions in lowercase, badges and labels in Sentence case.

## Ways of Working

### For all contributors

1. **Always work on a branch, never commit directly to main.** Create a branch, make changes, push, create a PR, review, merge.

2. **Read before writing.** Always read the file you're about to change. Understand existing patterns before modifying them.

3. **Run `npx svelte-check --threshold error` before pushing.** This catches type errors and broken imports. Pre-existing errors are known — only worry about new ones.

   **Integration tests** against a real Supabase stack: `npm run test:integration:local`. The three tiers (unit / integration / E2E) and `.env.local` auto-generation from `supabase status` are covered in `CONTRIBUTING.md`.

4. **Commit messages follow conventional format.** `fix: description`, `feat: description`, `docs: description`, `refactor: description`. Keep them concise.

5. **For copy/wording changes:** Edit `src/lib/copy.ts`. Single source for all user-facing text.

6. **For CSS fixes:** Use design tokens from `src/app.css` (`--space-*`, `--text-*`, `--radius-*`). Don't hardcode pixel values. The token catalogue lives in `src/app.css`.

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

**If a feature would require a GDPR / ePrivacy consent banner for visitors, treat that as a hard signal not to ship it as designed.** Cookies set before consent, third-party trackers, embedded third-party assets that observe visitors (Google Fonts, Mapbox, YouTube/Twitter embeds), and analytics that require consent all share a common shape: they push the data-handling boundary outward. The architectural posture of dyad — privacy port, payment opacity, calm-tech use shape — depends on that boundary staying tight. The consent banner is the visible evidence of drift; refusing to add the banner is how the drift is structurally prevented. Examples in the current stack: Plausible (cookieless, EU-hosted) is fine; Google Analytics would not be. Leaflet library, CSS, and marker icons self-hosted in `static/leaflet/`; tiles fetched from OpenStreetMap (no Mapbox/Google Maps embed). Self-hosted SangBleu Sunrise fonts instead of Google Fonts. Stripe Checkout (full-page redirect that satisfies Stripe's own privacy disclosure) instead of an embedded Stripe Element that observes visitors before consent. If a feature only works via a consent-requiring path, find a consent-free alternative or skip it. See `DESIGN.md` § *Consent-free as a constraint* for the design-level statement.

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
