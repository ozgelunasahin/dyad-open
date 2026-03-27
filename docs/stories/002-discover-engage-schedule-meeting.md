# Story 2: Discover, Engage & Schedule a Meeting

An onboarded user (Tom) explores the platform, finds a prompt, engages with it, and invites the starter (Sophie) to meet. Sophie reviews and confirms. A meeting is scheduled.

## Pools & Lanes

### Tom (Inviter)

1. **Start Event** — Arrives on site (logged out)
2. **Task** — Clicks login button
3. **Task** — Authenticates (authx)
4. **Task** — Lands on discover page
5. **Task** — Explores what's there
6. **Task** — Explores map view
7. **Exclusive Gateway** — Finds something engaging?
   - *No* → **Task** — Logs off → **End Event**
   - *Yes* → continues
8. **Task** — Clicks into a prompt
9. **Task** — Views prompt content + general area (system-generated from exact location, Airbnb-style)
10. **Task** — Writes a comment (private single-shot message to Sophie; other commenters' messages are not visible; editable with "edited" indicator)
11. **Exclusive Gateway** — Invite to meet?
    - *Not now* → **End Event** (comment submitted without invitation; Tom can return later to invite)
    - *Yes* → continues
12. **Task** — Views Sophie's available time slots with general area for each (slots where Tom already has a meeting are hidden)
13. **Task** — Selects ONE time+place option
14. **Task** — Writes a personal message to Sophie
15. **Task** — Clicks invite
16. **Intermediate Event (wait)** — Waits for response (no further negotiation possible)
17. **Exclusive Gateway** — Cancel pending invitation?
    - *Yes* → **Task** — Withdraws invitation (free action, no explanation, no consequences) → **End Event**
    - *No* → continues
18. **Intermediate Message Event (catch)** — Receives notification: Sophie confirmed
19. **Task** — Views scheduled meeting details (exact time slot + exact location now revealed)
20. **Task** — Option to add to calendar
21. **End Event** — Meeting is scheduled → continues in Story 4

### Sophie (Starter)

1. **Start Event** — Logs in to the app
2. **Task** — Sees comments and invitation notifications (can see all comments+invites on her prompt; can choose between them)
3. **Task** — Clicks an invitation
4. **Task** — Reads Tom's comment, personal message, and the time+place option he selected
5. **Task** — (Optional) Views Tom's profile
6. **Task** — (Optional) Sees Tom's public prompts (created and/or joined)
7. **Task** — (Optional) Sees feedback/testimonials about Tom (including reputation signals)
8. **Task** — Returns to invitation
9. **Exclusive Gateway** — Accept or not?
   - *Not now* → **End Event** (invitation remains pending until 12h before slot start time, then expires)
   - *Accept* → continues
10. **Task** — Confirms the meeting
11. **End Event** — Confirmation sent; accepted time slot hidden from other users; prompt remains visible with remaining slots

### System

1. **Task** — Renders login / handles auth
2. **Task** — Renders discover page + map view (hides time slots where user already has a meeting)
3. **Task** — Renders prompt detail with general area (derived from exact location)
4. **Task** — Accepts comment submission (private to Sophie; not visible to other commenters; tracks comment-without-invite metric)
5. **Task** — Presents invite-to-meet flow (Sophie's time slots with general areas, single selection, message)
6. **Task** — Creates pending meeting invitation
7. **Task** — Notifies Sophie of invitation
8. **Task** — Renders invitation detail for Sophie (comment, message, selected slot, Tom's profile/prompts/testimonials)
9. **Intermediate Message Event (catch)** — Receives Sophie's confirmation
10. **Task** — Reveals exact location to both parties
11. **Task** — Updates meeting status: pending → scheduled
12. **Task** — Hides accepted time slot from other users (prompt remains visible with remaining slots)
13. **Task** — Notifies Tom of confirmation
14. **Task** — Generates calendar event link
15. **Task** — Handles invitation expiry (12h before slot start time → expire unresponded invitations, notify inviters)

## Message Flows

- Tom → System: Login, comment (private, editable), invite request (one slot + message)
- System → Sophie: Invitation notification
- Sophie → System: Confirmation
- System → Tom: Confirmation notification + exact location
- System → Tom: Calendar event link
- System → Tom: Invitation expiry notification

## Key Domain Concepts

- **Prompt** — A published piece of content with attached meeting availability; visible on discover page and map. Individual time slots are hidden as they are booked. Prompt is archived when all slots are expired or booked.
- **Comment** — Private single-shot message from any user to the starter. One per user per prompt. Editable (with "edited" indicator). Can be sent without an invitation. The starter can see all comments and choose between them. Commenters have no visibility of each other.
- **Meeting Invitation** — One selected time+place option + personal message; no counter-offers or negotiation. Can be withdrawn by Tom before Sophie responds (free action, no consequences).
- **Invitation Expiry** — Invitations expire 12 hours before the selected slot's start time if not responded to.
- **Meeting** — States: pending → scheduled (→ Story 4)
- **General Area** — System-generated from exact location (Airbnb-style); shown before confirmation
- **Exact Location** — Revealed only after meeting is confirmed
- **Profile** — Public view: prompts created/joined, feedback/testimonials, reputation signals
- **Slot Visibility** — Time slots where the viewing user already has a meeting are hidden. Accepted slots are hidden from all other users.

## Open Questions

- What does "add to calendar" produce — .ics file, Google/Outlook deep link, both? (TBD)
- Invitation expiry notification wording — must avoid "rejection" framing (TBD)
