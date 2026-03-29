---
title: "fix: P0 sprint — unblock the core user flow"
type: fix
status: completed
date: 2026-03-27
origin: docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md
---

# P0 Sprint — Unblock the Core User Flow

Five fixes from playtesting that block the complete Tom↔Sophie cycle. All frontend, all on the prompt detail page or profile. (see brainstorm: docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md, P0 section)

## The Five Fixes

### 1. After responding, show the response — not "Response sent"

**Current:** Tom writes a response → sees "Response sent." with an Edit button. His actual words disappear behind a confirmation message.

**Fix:** After submitting, show the response text. No confirmation banner.

`src/routes/(app)/prompts/[id]/+page.svelte`:
- [ ] After successful submit, set `responseStatus = 'sent'` but immediately show the response text (not a success message)
- [ ] The response section becomes: Tom's response text + "Edit" link below it
- [ ] Remove "Response sent." text entirely

### 2. Guide Tom into the invitation flow after responding

**Current:** After responding, the invitation section appears silently below. Tom doesn't know it's there or what it means.

**Fix:** After the response, show a clear prompt leading into the invitation.

`src/routes/(app)/prompts/[id]/+page.svelte`:
- [ ] After response exists, show: "Would you like to meet @{author} in person?" as a section intro (placeholder-style guidance text, `--text-muted`)
- [ ] Below that, show available slots as selectable cards (or current slot list)
- [ ] When a slot is selected, show the "Add a message..." textarea
- [ ] Invite button: "Invite to meet"
- [ ] After invitation sent, show an invitation card: slot details + "Invitation sent — waiting for @{author}"

### 3. Show time slots on the conversation page for readers

**Current:** Readers can't see when/where the conversation is available until after they respond. The slots are hidden behind the response gate.

**Fix:** Show slots as read-only information before responding. The invitation action still requires a response first.

`src/routes/(app)/prompts/[id]/+page.svelte`:
- [ ] Below the body, before the response section, show: available time slots as read-only cards (date, time, duration, area)
- [ ] Not selectable — just informational. "Available times this week" or no header, just the cards.
- [ ] This gives readers context about when/where before deciding to engage

### 4. Profile restructure — Conversations + Meetings with invitations as the bridge

**Current:** Sophie opens the app, goes to profile, sees a 2x2 grid (Conversations, Meetings, Archive, Invitations). No indication that Tom sent her an invitation. She has to navigate to a specific prompt to find it.

**Fix:** Replace the 2x2 grid with two sections: **Conversations** and **Meetings**. Invitations appear in both — they are the bridge between a conversation and a meeting.

`src/routes/(app)/profile/+page.svelte` and `+page.server.ts`:

**Conversations section** — everything I'm involved in as a conversation:
- [ ] Prompts I authored (published, with lifecycle state: active / has responses / has invitations / meeting scheduled / complete)
- [ ] Prompts I responded to (showing my response + invitation state if I sent one)
- [ ] On author's conversation card: if there's a pending invitation → show inline: "@tom invited you · Saturday, Kreuzberg · [Accept]"
- [ ] On responder's conversation card: if I sent an invitation → show: "Invitation sent · waiting for @sophie"
- [ ] After acceptance: conversation card shows "Meeting scheduled · Saturday" with link to meeting
- [ ] Past/archived conversations at the bottom, reduced opacity
- [ ] Accept calls `POST /api/invitations/[id]/accept`, navigates to `/meetings/[meetingId]`

**Meetings section** — pending, scheduled, past:
- [ ] Pending: invitations I've received but not yet accepted (duplicate of what's on conversation cards, but grouped by time — "this week's meetings")
- [ ] Scheduled: confirmed meetings with time, location, @participant, link to meeting detail
- [ ] Past: completed meetings, reduced opacity
- [ ] Sorted: pending first (soonest slot), then upcoming scheduled (soonest), then past

**Invitations as the bridge:**
- [ ] An invitation appears on the conversation card ("Tom invited you") AND in the Meetings section as a pending meeting
- [ ] Accepting it from either place promotes it to a confirmed meeting in Meetings, and the conversation card updates to "Meeting scheduled"
- [ ] The invitation links the two views — tapping the conversation title from a meeting navigates to the prompt, tapping the meeting time from a conversation navigates to the meeting detail

**Sidebar badge** (`src/routes/(app)/+layout.svelte`):
- [ ] Count badge next to "Profile" when attention items > 0
- [ ] Count = pending received invitations + due feedback forms

### 5. Feedback page context

**Current:** Feedback gate redirects to `/feedback/[id]` which shows a form with no context about who you met or when.

**Fix:** Add meeting context at the top of the feedback form.

`src/routes/(app)/feedback/[id]/+page.svelte` and `+page.server.ts`:
- [ ] Load the meeting details (other participant username, conversation title, date)
- [ ] Show at the top: "You met @{otherPerson} on {date}" with a link to the conversation
- [ ] Then the existing feedback form below

## Files Changed

| File | Changes |
|------|---------|
| `src/routes/(app)/prompts/[id]/+page.svelte` | Fix #1 (response display), #2 (invitation guidance), #3 (read-only slots) |
| `src/routes/(app)/profile/+page.svelte` | Fix #4 (needs attention section) |
| `src/routes/(app)/profile/+page.server.ts` | Fix #4 (load received invitations) |
| `src/routes/(app)/+layout.svelte` | Fix #4 (sidebar badge) |
| `src/routes/(app)/feedback/[id]/+page.svelte` | Fix #5 (meeting context) |
| `src/routes/(app)/feedback/[id]/+page.server.ts` | Fix #5 (load meeting details) |

## Implementation Order (3 PRs)

**PR 1: Prompt detail fixes (#1, #2, #3)**
Single file change. Fixes the reader/inviter experience.

**PR 2: Profile restructure (#4)**
Replace 2x2 grid with Conversations + Meetings sections. Invitations as bridge between them. Sidebar badge. This is the largest PR.

**PR 3: Feedback context (#5)**
Small independent change to the feedback page. Add meeting context.

## Acceptance Criteria

- [ ] Tom submits a response → sees his response text, not "Response sent"
- [ ] Below the response, Tom sees "Would you like to meet @sophie in person?" + available slots
- [ ] Before responding, Tom can see when/where the conversation is available (read-only slots)
- [ ] Tom selects a slot, writes a message, sends invitation → sees "Invitation sent — waiting for @sophie" card
- [ ] Sophie opens profile → sees invitation card with Accept button at top
- [ ] Sophie taps Accept → navigates to meeting detail with location
- [ ] Sidebar shows badge count when Sophie has pending invitations
- [ ] Feedback page shows "You met @tom on Saturday" before the form
- [ ] Build passes, tests pass

## Sources

- **Origin brainstorm:** `docs/brainstorms/2026-03-27-user-testing-feedback-brainstorm.md` — P0 items #1-5
- Design system: `docs/design/design-system.md` — guidance through placeholders pattern
- Existing code: PR #55 (author invitation view on prompt detail)
