---
title: "feat: Core flow UX — complete the discover→meet→feedback cycle + test harness"
type: feat
status: active
date: 2026-03-27
---

# Core Flow UX — Complete the Discover → Meet → Feedback Cycle + Test Harness

The individual pages exist but the connections between them are broken or missing. This plan fixes the flow so two users can complete the full cycle, and adds automated tests to prevent regressions.

## The Flow (from user stories)

```
Sophie publishes a conversation (Story 3)
    → Tom discovers it, writes a response, sends an invitation (Story 2, Tom's lane)
    → Sophie sees the invitation, reads Tom's response, accepts (Story 2, Sophie's lane)
    → Meeting is scheduled, location revealed to both
    → They meet in person
    → Both submit feedback, feedback revealed simultaneously (Story 4)
    → App unlocked, back to discover
```

## Audit: Where the Flow Breaks

| Step | Works? | Gap |
|------|--------|-----|
| Sophie publishes | Yes | — |
| Tom discovers | Yes | — |
| Tom writes response | Yes | — |
| Tom sends invitation | Partial | No personal message input (API supports it, UI doesn't) |
| **Sophie sees invitation** | **No** | **No UI anywhere. Critical break.** |
| **Sophie accepts** | **No** | **API exists, no frontend.** |
| Meeting detail shows | Partial | No other participant name, no prompt context, no "add to calendar" |
| **Meeting → feedback** | **No** | **No link to feedback form. Meeting page is a dead end after meeting time.** |
| Feedback form | Yes | Gate redirect works, form submits |
| **Revealed feedback** | **No** | **API exists, no UI to view it.** |
| Profile surfaces action items | No | No received invitations, no attention indicators |

Backend is fully implemented. All API endpoints exist. The gaps are entirely frontend.

## Proposed Solution

### Phase 1: Author Invitation View (the critical break)

**On the conversation detail page** (`src/routes/(app)/prompts/[id]/+page.svelte`), add an author-only section showing received invitations.

**Page server changes** (`+page.server.ts`):
- [ ] Load received invitations for the author: join `prompt_invitations` with `prompt_comments` and `profiles` to get inviter username, response text, personal message, selected slot details
- [ ] Return as `receivedInvitations` in page data

**UI changes** (author view on prompt detail):
- [ ] "Invitations" section below "Responses received", only when invitations exist
- [ ] Each invitation card shows:
  - @username of inviter
  - Their response text (the meeting context)
  - Personal message (if provided)
  - Selected time slot (date, time, duration, general area)
  - Accept button (primary) + Decline button (secondary)
- [ ] Accept calls `POST /api/invitations/[id]/accept`, then navigates to meeting detail
- [ ] Decline: for v0.1, invitations expire naturally (12h before slot). No explicit decline needed. The card just stays until it expires or is accepted.
- [ ] After acceptance: card transforms to show "Meeting confirmed" with link to `/meetings/[id]`

**Comment author identity** (prerequisite):
- [ ] Update `+page.server.ts` to join `profiles` on `prompt_comments.author_id` to get username
- [ ] Show `@username` on each response card in the author view

### Phase 2: Personal Message on Invitation

- [ ] Add a textarea to the invitation section on the prompt detail page (reader view)
- [ ] Label: "Add a message" (optional)
- [ ] Pass `message` field in the POST to `/api/prompts/[id]/invitations`

### Phase 3: Profile "Needs Your Attention"

**Profile page** (`src/routes/(app)/profile/+page.svelte`):
- [ ] Add "Needs your attention" section above the action card grid
- [ ] Section only visible when there are items; completely absent when empty
- [ ] Load received invitations in `+page.server.ts` (invitations where the user is the prompt author and state = 'pending')
- [ ] Each item: compact card with prompt title, @inviter, time slot, Accept button
- [ ] Tapping card navigates to the prompt detail page (where full context is)

**Sidebar badge** (`src/routes/(app)/+layout.svelte`):
- [ ] Add a count badge next to "Profile" in the sidebar when attention items > 0
- [ ] Count = pending received invitations + due feedback forms
- [ ] Use `--font-mono`, small, dark bg, light text (matches existing `count-badge` pattern)

### Phase 4: Meeting Detail Improvements

**Meeting page** (`src/routes/(app)/meetings/[id]/+page.svelte`):
- [ ] Show other participant's @username
- [ ] Link to the original conversation (prompt)
- [ ] State-aware content:
  - Before meeting: time, location, cancel button
  - After meeting time (awaiting_feedback): "How did it go?" link to feedback form
  - After feedback submitted: "Waiting for [other person]'s feedback"
  - After both submitted: show revealed feedback

**Page server** (`+page.server.ts`):
- [ ] Load other participant's username from profiles
- [ ] Load prompt title + ID for context link
- [ ] Load feedback form state (due/submitted/revealed)
- [ ] If both submitted, load revealed feedback via `GET /api/meetings/[id]/feedback`

### Phase 5: Post-Feedback Reveal

**Meeting page** (after both feedbacks submitted):
- [ ] Show the other person's "share with you" text
- [ ] Show their adjective selections
- [ ] Option to display on profile (checkbox or toggle) — can be deferred to later

### Phase 6: Test Harness

#### 6a. CI Pipeline

Create `.github/workflows/ci.yml`:
- [ ] Job 1: `lint-and-unit` — svelte-check + vitest unit tests (~5s)
- [ ] Job 2: `integration` — supabase start + vitest integration tests (~30s), depends on job 1
- [ ] Job 3: `e2e` — supabase start + playwright chromium, depends on job 2
- [ ] Upload playwright report on failure

#### 6b. Full-Flow Integration Test

Create `tests/integration/full-flow.test.ts`:
- [ ] One describe block that chains the entire cycle:
  1. User A creates + publishes prompt with slot
  2. User B writes response
  3. User B sends invitation
  4. User A accepts invitation (meeting created)
  5. Admin advances meeting to past
  6. User A submits feedback
  7. User B submits feedback (triggers reveal)
  8. Both see revealed feedback
  9. Gate check: neither user gated

#### 6c. E2E Smoke Test

Create `tests/e2e/smoke.test.ts`:
- [ ] Two-user auth setup (digit + other user)
- [ ] Logged-in user sees discover page with prompts
- [ ] Navigate to profile, see conversations
- [ ] Navigate to a prompt detail, see content

#### 6d. E2E Multi-User Flow

Create `tests/e2e/invitation-flow.test.ts`:
- [ ] Two browser contexts (User A, User B)
- [ ] User B navigates to User A's published prompt
- [ ] User B writes response, sends invitation
- [ ] User A navigates to prompt, sees invitation, accepts
- [ ] Both users see meeting detail with location

#### 6e. Playwright MCP for Exploratory Testing

- [ ] Add playwright MCP to `.mcp.json`
- [ ] Document usage in CLAUDE.md

## Files Changed

| File | Change |
|------|--------|
| `src/routes/(app)/prompts/[id]/+page.svelte` | Author invitation view, accept button, comment usernames |
| `src/routes/(app)/prompts/[id]/+page.server.ts` | Load received invitations + comment usernames |
| `src/routes/(app)/profile/+page.svelte` | "Needs your attention" section |
| `src/routes/(app)/profile/+page.server.ts` | Load received invitations count |
| `src/routes/(app)/+layout.svelte` | Sidebar badge for attention items |
| `src/routes/(app)/meetings/[id]/+page.svelte` | Other participant, prompt link, feedback states |
| `src/routes/(app)/meetings/[id]/+page.server.ts` | Load participant, prompt, feedback data |
| `.github/workflows/ci.yml` | **New** — CI pipeline |
| `tests/integration/full-flow.test.ts` | **New** — full cycle integration test |
| `tests/e2e/smoke.test.ts` | **New** — E2E smoke test |
| `tests/e2e/invitation-flow.test.ts` | **New** — E2E multi-user flow |
| `tests/auth.setup.ts` | Two-user auth setup |

## Technical Considerations

- **No new API endpoints needed.** All backend APIs exist: accept invitation, get meeting feedback, notification API. The work is frontend-only for phases 1-5.
- **RLS for received invitations:** The query needs to join invitations → prompts → profiles. The `prompt_invitations` RLS allows the prompt author to see invitations on their prompts. Verify this with integration tests.
- **Invitation decline:** User stories say invitations expire 12h before slot start. No explicit decline for v0.1 — invitations that aren't accepted simply expire. This avoids "rejection framing" per open questions.
- **SECURITY DEFINER for accept:** The `accept_invitation` RPC already handles atomicity (slot booking, invitation state, meeting creation). No changes needed.
- **Feedback gate timing:** The gate activates at meeting start time via `hooks.server.ts`. The meeting detail page needs to check the feedback form state to show the right UI, not rely on the gate redirect.

## Design Principles Compliance

| Principle | How this plan addresses it |
|-----------|--------------------------|
| No pre-meeting contact | Responses and invitations are one-way. Accept/decline is a single action, not a conversation. |
| Healthy brain | No push notifications. Badge appears only when user visits the app. "Needs attention" section is calm — no red/orange, no animations, vanishes when resolved. |
| No tutorial modals | Empty states explain what goes where. Progressive disclosure on prompt detail (respond → invite → wait). |
| Comments are private | Response text visible only to author. Invitation cards show the responder's text to the author only. |
| Feedback gate | Meeting page transitions naturally to feedback link. Gate redirect is the hard enforcement. |
| Simultaneous reveal | Revealed feedback shown on meeting page after both submit. No one sees feedback first. |

## Acceptance Criteria

### Flow
- [ ] Tom can write a response and send an invitation with a personal message
- [ ] Sophie can see received invitations on her prompt detail page
- [ ] Sophie can see the inviter's username and response text
- [ ] Sophie can accept an invitation (meeting created, location revealed)
- [ ] Meeting detail shows other participant, prompt link, and feedback state
- [ ] After meeting time, meeting page links to feedback form
- [ ] After both submit feedback, meeting page shows revealed feedback
- [ ] Profile shows "needs your attention" when invitations are pending
- [ ] Sidebar shows badge count for attention items

### Tests
- [ ] CI pipeline runs lint + unit + integration on every PR
- [ ] Full-flow integration test passes (create → publish → respond → invite → accept → feedback)
- [ ] E2E smoke test passes (login, navigate, see content)
- [ ] E2E multi-user test passes (two users complete invitation flow in browser)

## Implementation Order (separate PRs)

**PR 1: Author invitation view + comment usernames** (Phase 1 + 2)
The critical break fix. Unblocks playtesting.

**PR 2: Profile attention section + sidebar badge** (Phase 3)
Surfaces action items without a notification system.

**PR 3: Meeting detail improvements** (Phase 4 + 5)
Completes the post-acceptance through post-feedback flow.

**PR 4: CI pipeline + integration test** (Phase 6a + 6b)
Safety net for all future changes.

**PR 5: E2E tests** (Phase 6c + 6d + 6e)
Browser-level validation of the full cycle.

## Sources

- User stories: `docs/stories/002-discover-engage-schedule-meeting.md`, `003-start-a-conversation.md`, `004-meeting-feedback-loop.md`
- Design principles: `docs/design/design-principles.md`
- Design system: `docs/design/design-system.md`
- Repo audit: all page files, API endpoints, service methods audited
- UX research: Airbnb host tools, Couchsurfing request flow, NNG notification taxonomy, "Quiet Indicators, Loud on Entry" pattern
- Testing research: Playwright multi-user contexts, Supabase CI, existing integration test patterns
- Institutional learnings: SECURITY DEFINER for atomic accept, copy-on-write for Svelte 5, generation counter for async
