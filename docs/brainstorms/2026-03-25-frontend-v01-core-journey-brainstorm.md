---
topic: Frontend for v0.1 core user journey
date: 2026-03-25
status: complete
participants: digit, claude
---

# Frontend for v0.1 Core User Journey

What to build, what to keep, what to remove, and the design direction for the first frontend pass on the `dev` branch.

## What We're Building

Two parallel workstreams covering both sides of the user journey:

**Author experience:** Create prompt → write (TipTap, auto-save) → add cover image → add time slots + location → publish → see on discover → manage (edit/unpublish/republish/archive)

**Reader/engagement experience:** Discover feed → click prompt → read full content → comment → select slot + invite → view meeting details + location → submit feedback

Plus: landing page with prompt previews for anonymous visitors, profile page showing the user's prompts by state, feedback submission form (gated).

## Key Decisions

### 1. Scope: both workstreams in parallel
Both author and reader experiences are needed for v0.1. Neither makes sense alone — you need prompts to discover, and you need discovery to make prompts visible. Split into two PRs that can be developed concurrently.

### 2. Remove old canvas pages now
The canvas-based routes (`/dashboard`, `/canvas/[canvasId]`, `/sites/*`, `/@[username]/*`) will be deleted from `dev`. This is a clean break — the dev branch represents the v0.1 domain model. The canvas module is preserved on `main` for future extraction as a separate project.

Specifically remove:
- `src/routes/dashboard/` (595-line canvas dashboard → replaced by prompt-based profile)
- `src/routes/canvas/` (canvas editor → replaced by prompt editor)
- `src/routes/sites/` (site builder → not in v0.1 scope)
- `src/routes/@[username]/` (public canvas view → replaced by prompt detail + public profile)
- `src/routes/essay/` (legacy essay reader)
- `src/routes/projections/` (unused)
- `src/routes/discovery/` (unused redirect)
- Canvas-specific components: `Canvas.svelte`, `NoteCard.svelte`, `ConnectionLine.svelte`, `SiteSPA.svelte`, `WebsiteContainer.svelte`, `SectionList.svelte`, `SectionCard.svelte`, `ExpandableContent.svelte`, `HighlightPopover.svelte`, `CommentCard.svelte`, `CommentSidebar.svelte`, `MobileReader.svelte`, `MobileReaderPage.svelte`, `FieldNotesSection.svelte`, `HelpBar.svelte`, `MeetingsSection.svelte`, `ConversationCard.svelte`, `JoinGate.svelte`, `RotatingConversationHeadline.svelte`, `FeedbackModal.svelte`, `MeetingInviteModal.svelte`
- Canvas store: `src/lib/stores/canvas.svelte.ts` (2,400 lines)
- Canvas-specific utilities: `pathfinding.ts`, `geometry.ts`, `layout.ts`

Keep:
- `TiptapEditor.svelte` (reuse for prompt editor)
- `CitySearch.svelte`, `PlaceSearch.svelte` (reuse for location picker, adapt to return `LocationRef`)
- `MapView.svelte` (adapt later for prompt slot map)
- `SiteNav.svelte` (adapt for the new nav)
- `SiteFooter.svelte`
- `JoinSection.svelte` (waitlist form)
- Theme store, TipTap extensions, domain logic, services, server utilities

### 3. Design direction: build on design branches
Take inspiration from `feat/v0.1-design-work` and `feat/v0.1-design-profile`:
- Floating nav (pill-shaped, mobile-first)
- Sidebar on desktop, hamburger on mobile
- Card-based prompt listings with thumbnail, title, snippet, dates, neighbourhood
- Clean serif typography (SangBleu Sunrise)
- Beige/neutral palette
- Adapt all designs for the prompt domain model (not canvas/conversation)

Don't copy verbatim — the design branches used the old "conversation" terminology and canvas data model. Use the patterns and aesthetic, not the data wiring.

### 4. Landing page: prompt previews + join waitlist
Anonymous visitors see published prompts as teasers (title, snippet, neighbourhood, date). Clicking anything leads to "join waitlist" or "log in". The existing `JoinSection.svelte` waitlist form is reused. Prompt data comes from `PromptQueryService.getPublishedPrompts` (same as discover, but for anonymous — needs a public endpoint or server-side rendering without auth).

### 5. Prompt editor: two-step flow
**Step 1: Write** — Dedicated page at `/prompts/new` (or `/prompts/[id]/edit` for existing). Title input + TipTap body + cover image upload. Auto-saved as draft with debounce. No scheduling yet.

**Step 2: Schedule + Publish** — From the draft view, open a scheduling panel/modal. Pick 1-3 time slots (rolling 7-day calendar), set location per slot (Nominatim autocomplete returning `LocationRef`), optional "same location for all" shortcut. Publish button validates requirements (title, 1+ slot, locations).

### 6. Prompt detail page at /prompts/[id]
Dedicated full page for reading a prompt. Shows:
- Title, body (rendered HTML via `body_html`)
- Cover image
- Available time slots with general area + date
- Author username
- Comment form (single-shot, private to author)
- Invite flow (select slot, write message, send)
- If viewing own prompt: edit link, comment/invitation management

## Open Questions

*All resolved during brainstorm.*

## Route Structure

```
/ — Landing page (prompt previews + waitlist for anon, redirect to /discover for auth)
/login — Login
/join — Registration (via invite)
/logout — Logout
/discover — Prompt feed (authenticated)
/prompts/new — Create new prompt (draft)
/prompts/[id] — Prompt detail (read, comment, invite)
/prompts/[id]/edit — Edit prompt (draft or published)
/profile — My prompts, meetings, feedback
/meetings/[id] — Meeting detail (with location after acceptance)
/feedback/[id] — Feedback form (gated)
/impressum — Legal
/datenschutz — Privacy
/waitlist — Waitlist confirmation
```

## What Stays from Main

The canvas component and related code are preserved on `main`. When `dev` eventually merges to `main`, the canvas routes will be removed. The canvas extraction as a separate open-source project is tracked separately.

## Sources

- Design branches: `feat/v0.1-design-work`, `feat/v0.1-design-profile` (reviewed earlier in this session)
- User stories: `docs/stories/001-004`
- Design principles: `docs/design/design-principles.md`
- v0.1-rc scope: `~/.claude/projects/-home-digit-dyad-berlin/memory/project_v01_rc_scope.md`
- TipTap integration gotcha: `docs/solutions/integration-issues/svelte5-tiptap-reactive-loop.md`
