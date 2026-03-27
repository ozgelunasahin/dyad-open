---
topic: User testing feedback — v0.1 playtesting notes
date: 2026-03-27
status: active
participants: digit, sophie (tester), tom (tester), claude
---

# User Testing Feedback — v0.1 Playtesting

Real playtesting notes from two users (Sophie and Tom) going through the core flow. Categorised by severity and grouped by area.

## Triage

### P0 — Core Flow Broken (can't complete the journey without these)

| # | Issue | Where | Notes |
|---|-------|-------|-------|
| 1 | Sophie can't find/accept invitations | Profile + Prompt detail | PR #55 merged — author now sees invitations on prompt detail. But Sophie still has to navigate to the specific prompt to find them. Needs surfacing on login/profile. |
| 2 | No invitation visibility on login | App-wide | Sophie should see she has pending invitations immediately when she logs in. Not buried inside a specific prompt. |
| 3 | After commenting, "response sent" shown instead of the response | Prompt detail | User wants to see their actual response text, not a confirmation message. The invitation flow should activate naturally from there. |
| 4 | Invitation flow guidance is unclear | Prompt detail | After responding, Tom doesn't understand he can now invite. Needs: "You can now invite Sophie for an in-person conversation. Here are her available times." |
| 5 | Feedback modal doesn't appear on first login after meeting | App-wide | Currently feedback gate redirects to `/feedback/[id]`, but this feels like a broken page, not a natural next step. Should feel like a modal/overlay on first login. |

### P1 — Significant UX Issues (confusing but workaround exists)

| # | Issue | Where | Notes |
|---|-------|-------|-------|
| 6 | Log in button hard to find on landing page | Landing page | Monospace "log in" top-right is too subtle |
| 7 | Can't see own conversations on discover | Discover | Currently filtered out. Users expect to see them. |
| 8 | Can't see date/place on conversation page | Prompt detail | Slot information not visible to readers until they respond |
| 9 | No way to edit published conversations | Editor | Edit link exists from profile but not obvious. No edit from prompt detail. |
| 10 | After creating conversation, should land on discover with it on top | Editor → Discover | Currently redirects to prompt detail after publish |
| 11 | Profile structure wrong | Profile | Should be: Conversations (started + engaged) and Meetings (pending, scheduled, past). Not the 2x2 grid. |
| 12 | Map doesn't fill page on desktop | Discover | Map is constrained within the content column |

### P2 — Polish (would be nice, not blocking)

| # | Issue | Where | Notes |
|---|-------|-------|-------|
| 13 | Request to join should be modal, not page | Landing page | Currently navigates to /waitlist |
| 14 | Registered users get no message when trying to join again | Landing/Waitlist | Should say "you already have an account" |
| 15 | Editor body placeholder needs more guidance | Editor | "Start writing..." is too vague for first-time users |
| 16 | Location name before address in publish | PublishSheet | Currently shows "Mokofuk, Grünberger Straße 75" — name is there but should be more prominent |
| 17 | Clicking conversation on discover should open modal | Discover desktop | Currently navigates to full page |
| 18 | Conversation listings should look the same everywhere | App-wide | Profile list items look different from discover cards |
| 19 | Tom wants invitation card view with link to all meetings | Prompt detail | After sending invitation, show a card with status |
| 20 | Sorting on discover page | Discover | Future feature — sort by date, area, newest |

## Key Decisions

### 1. Invitation surfacing: where does Sophie see them?

**The problem:** Sophie has to navigate to the specific prompt to see invitations. She doesn't know they exist until she happens to check.

**Decision:** Two places:
- **Profile "needs attention" section** — shows compact invitation cards at the top of the profile page. This is where Sophie goes first when she opens the app.
- **Prompt detail (already done)** — PR #55 shows full invitation cards with accept button.

The profile section links to the prompt detail for full context + accept action.

### 2. After commenting: show response + activate invitation

**The problem:** "Response sent" is unhelpful. Tom wants to see what he wrote and understand he can now invite.

**Decision:** After submitting a response:
- Show the response text (not "Response sent")
- Below it, show guidance text: "Would you like to meet [author] in person?"
- Show available time slots with the invitation flow
- This is progressive disclosure — the invitation section reveals naturally after responding

### 3. Profile restructure

**The problem:** 2x2 grid of Conversations/Meetings/Archive/Invitations splits the user's mental model.

**Decision:** Two sections:
- **Conversations** — everything I've started or engaged with, showing lifecycle state
- **Meetings** — pending invitations, scheduled meetings, past meetings

This aligns with the core flow plan (Phase 3) which already proposed conversations as the organising unit.

### 4. Feedback on login

**The problem:** The feedback gate redirects to `/feedback/[id]` which feels jarring.

**Decision:** Keep the gate redirect (it works), but improve the feedback page to feel like a natural step, not a broken page. Add context: "You met [person] on [date]. How did it go?" This is a page design issue, not an architecture change.

### 5. Own conversations on discover

**The problem:** Users expect to see their own published conversations on the discover page.

**Decision:** Show own conversations on discover, but visually distinguish them (e.g. "yours" badge or subtle indicator). Currently they're filtered out in `getPublishedPrompts`. Remove the filter.

## What We're NOT Doing (v0.1)

- Conversation modal on discover (P2, significant frontend complexity)
- Join waitlist as modal (P2, design branch had this but we chose routes)
- Sorting on discover (future feature)
- Real-time notification of new invitations (healthy brain — check when you open the app)

## Implementation Priority

**Sprint 1 — Unblock the flow (P0 items):**
1. Fix "response sent" → show actual response + invitation guidance (#3, #4)
2. Profile "needs attention" section with invitation cards (#1, #2)
3. Show slots on conversation page for readers (#8)

**Sprint 2 — Fix significant UX (#P1 items):**
4. Profile restructure: Conversations + Meetings (#11)
5. Show own conversations on discover (#7)
6. Edit link on published conversations (#9)
7. Redirect to discover after publish (#10)
8. Make login more visible on landing (#6)
9. Desktop map fills page (#12)

**Sprint 3 — Polish (P2 items):**
10. Consistent conversation card component everywhere (#18)
11. Location name prominence (#16)
12. Better editor body placeholder (#15)
13. Invitation card view for Tom (#19)
14. Registered user join message (#14)

## Open Questions

*All resolved during triage — no open questions.*

## Sources

- Playtesting session notes (digit, 2026-03-27)
- Existing plans: `docs/plans/2026-03-27-feat-core-flow-ux-and-testing-plan.md`
- Design principles: `docs/design/design-principles.md`
