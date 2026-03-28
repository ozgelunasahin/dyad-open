# CLAUDE.md — Developer Guide

## Project Overview

dyad.berlin is a SvelteKit app for facilitating in-person conversations in Berlin. Users write conversation prompts, schedule meeting slots with locations, and meet strangers for real conversations. The platform handles the full cycle: discover → respond → invite → meet → give feedback.

**Stack:** SvelteKit, Svelte 5 (runes), Supabase (auth + DB + storage), TipTap/ProseMirror (rich text editor), Leaflet (map), Cloudflare Pages.

**Domain vocabulary:** The internal model uses "prompt" for the written conversation starter. User-facing copy uses "conversation." See `docs/design/domain-language.md` for the full mapping.

## Architecture

### Service Layer Pattern

All data access goes through typed service interfaces with Supabase implementations:

```
src/lib/services/
  prompt-command.ts    # PromptCommandService — create, update, publish, slots
  prompt-query.ts      # PromptQueryService — discover feed, detail, my prompts
  comment.ts           # CommentService — responses (called "comments" in DB)
  invitation.ts        # InvitationService — create, cancel, accept
  meeting.ts           # MeetingService — detail, cancel
  feedback.ts          # FeedbackService — form, submit, vocabulary
  gate.ts              # GateService — feedback gate check
  location.ts          # Location search via Nominatim (server-side)
```

Services are TypeScript interfaces + `Supabase*` implementation classes. Page server loaders call services directly (not internal API fetches). The test factory in `tests/helpers/db.ts` is the single swap point for portability.

### (app) Layout Group

All authenticated routes live under `src/routes/(app)/`. The layout provides:
- Auth guard (redirect to `/login` if not authenticated)
- Username loading from profiles
- Sidebar nav (Discover, Profile) + mobile hamburger

### Feedback Gate

`src/hooks.server.ts` checks every authenticated request for pending feedback forms. Gated users are redirected to `/feedback/{formId}`. Exempt paths: `/_app/`, `/feedback`, `/api/feedback`, `/api/auth`, `/api/vocabulary`, `/auth`, `/logout`, `/impressum`, `/datenschutz`, `.webmanifest`, `/service-worker`, `/favicon`.

### Key Patterns

- **Generation counter for async races**: Used in the prompt editor's auto-save (`saveGeneration`) and the MapView marker rebuilds. Prevents stale responses from corrupting state.
- **TipTap + Svelte 5**: Use `createSubscriber` from `svelte/reactivity` to bridge TipTap transactions into runes. Never call store methods directly from `onUpdate`. See `docs/solutions/integration-issues/svelte5-tiptap-reactive-loop.md`.
- **Copy-on-write for reactivity**: Svelte 5 runes track by assignment. Any `Map` or `Set` mutation must create a new instance.
- **Response-first invitation flow**: Users must write a response before they can invite to meet. The response IS the meeting context.

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
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (public, works with RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Only for admin scripts |

## Database

Schema defined in `supabase/migrations/` (source of truth). Key tables:
- `prompts` — Conversations with state machine (draft → published → archived)
- `time_slots` — Meeting slots with exact_location (private) and general_area (public)
- `prompt_comments` — Responses to conversations (one per user per prompt)
- `prompt_invitations` — Meeting invitations tied to slots
- `meetings` — Scheduled meetings between two users
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

- `docs/design/design-principles.md` — Core product principles (no pre-meeting contact, healthy brain, feedback gate)
- `docs/design/design-system.md` — Visual language, tokens, component specs
- `docs/design/domain-language.md` — Internal vs user-facing vocabulary
- `docs/design/user-archetypes.md` — Seekers, explorers, gatherers, in-betweeners
- `docs/design/sustainability-and-accessibility.md` — Business model, steward ownership, venue partnerships
- `docs/stories/` — User stories (001-004)
- `docs/solutions/` — Documented gotchas and patterns (24 solution docs)
- `docs/ROADMAP.md` — v0.1 → v0.2 → v0.3 scope and driving factors

## Todos & Plans

The `todos/` directory contains prioritized findings from code reviews. Files follow the pattern `{NNN}-{status}-{priority}-{description}.md`. Completed items are in `todos/archive/`.

The `docs/plans/` directory contains implementation plans. When resolving a todo or completing a plan, always move the file to the corresponding `archive/` subdirectory rather than deleting it.

## Ways of Working

### For all contributors (including non-technical co-founders using Claude Code)

1. **Always work on a branch, never commit directly to main.** Create a branch, make changes, push, create a PR, review, merge. This protects main from broken code.

2. **Read before writing.** Always read the file you're about to change. Understand the existing code before modifying it. Use the design docs and solution docs as context.

3. **Run `npx svelte-check --threshold error` before pushing.** This catches type errors and broken imports. Pre-existing errors (15, all Supabase type widening) are known — only worry about NEW errors.

4. **Commit messages follow conventional format.** `fix: description`, `feat: description`, `docs: description`, `refactor: description`. Keep them concise.

5. **Check `docs/solutions/` before implementing.** Past gotchas are documented there. The TipTap reactive loop, Leaflet SSR issues, RLS visibility patterns — don't rediscover what's already known.

6. **For copy/wording changes:** Edit `src/lib/copy.ts` (once it exists — part of v0.1 work). This is the single source for all user-facing text.

7. **For CSS fixes:** Use design tokens from `src/app.css` (`--space-*`, `--text-*`, `--radius-*`). Don't hardcode pixel values. Check `docs/design/design-system.md` for the spec.

8. **For bug fixes during alpha test:** Read the in-app feedback report, understand the issue, check if there's a related todo in `todos/`, fix on a branch, PR, merge. If unsure, leave a comment on the PR describing the uncertainty.

### Admin operations (during alpha test)

- **Invite new users:** Admin panel → Waitlist → click "Invite" next to the user
- **View tester feedback:** Admin panel → Feedback
- **View users:** Admin panel → Users
- **No database access needed** for routine operations
