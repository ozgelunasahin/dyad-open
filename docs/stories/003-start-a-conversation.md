# Story 3: Start a Prompt

Sophie browses the discover page, doesn't find anything compelling, and decides to start her own prompt. She writes, publishes, and sets availability for in-person meetings.

## Pools & Lanes

### Sophie (Starter)

1. **Start Event** — Arrives on site
2. **Task** — Logs in
3. **Task** — Browses discover page
4. **Task** — Checks out some prompts
5. **Exclusive Gateway** — Finds something engaging?
   - *Yes* → joins Story 2 flow (engage/comment/invite)
   - *No* → continues
6. **Task** — Clicks "Start a prompt" button
7. **Task** — Enters prompt editor
8. **Task** — Writes content (substack-meets-reddit style, freeform length)
9. **Task** — Adds cover image (URL from internet or upload)
10. **Task** — Clicks publish
11. **Task** — Prompted with publish decisions (meetings only, no in-app messaging)
12. **Task** — Chooses 1–3 preferred time slots (start time + duration) within a rolling 7-day window
13. **Task** — For each time slot, chooses a location via autocomplete (region-scoped, Berlin for now)
    - Option to carry over same location to all slots without re-entering
14. **Task** — Submits options
15. **End Event** — Prompt published (visible on profile, discover page, and map)

### System

1. **Task** — Renders discover page
2. **Task** — Renders prompt editor
3. **Task** — Handles image upload / URL embed; resizes to standard size+format
4. **Task** — On publish click, presents scheduling flow
5. **Task** — Presents date/time picker (rolling 7-day window, 1–3 slots, start time + duration per slot)
6. **Task** — Provides location autocomplete (region-scoped via location API)
7. **Task** — Offers "same location for all slots" shortcut
8. **Task** — Generates general area from exact location (Airbnb-style, e.g. neighbourhood/postcode)
9. **Task** — Creates prompt record with content, cover image, time slots, exact locations (stored), general areas (displayed)
10. **Task** — Publishes to discover page, map, and Sophie's profile
11. **Task** — Monitors slot expiry: auto-archives prompt when all slots expire without valid future time slots
12. **End Event** — Prompt live

## Links to Other Stories

- **Story 2**: Sophie's published prompt is what Tom discovers. The time slots and general areas she sets here are what Tom sees. Tom selects ONE option. Sophie's exact locations are revealed only after she confirms a meeting. Accepted time slots are hidden from other users.
- **Story 2 gateway reuse**: Sophie's own "nothing jumps out" moment mirrors Tom's exclusive gateway — discover page is a shared entry point for both engaging and creating.
- **Story 4**: If a meeting is cancelled within the cancellation window, the prompt reappears on discover/map. Sophie can also re-publish an archived prompt with new time slots.

## Key Domain Concepts

- **Prompt** — User-authored content (rich text + cover image) with attached meeting availability. Can be re-published after archival, whether or not a meeting happened.
- **Time Slots** — 1–3 preferred start times with duration, within a rolling 7-day window. Editable/removable as long as no invitation has been proposed for that slot. Slots where the user already has a meeting are hidden from inviters.
- **Rolling 7-Day Window** — Sophie keeps a prompt alive by opening new time slots. Without activity (no valid future slots), the prompt is auto-archived and requires re-publishing.
- **Preferred Time Slot** — A specific start time and duration, not an availability block. Keep the interface simple.
- **Exact Location** — Per-slot, chosen via autocomplete from location API (region-scoped). Stored but not publicly shown.
- **General Area** — System-generated from exact location (Airbnb-style). Shown on discover page and map.
- **Location Carry-Over** — Convenience option to apply the same location to all time slots
- **Publish** — Makes prompt visible on discover page, map, and author's profile
- **Unpublish** — Sophie can voluntarily unpublish. Active invitations are resolved per cancellation policy.
- **No in-app messaging** — Platform enforces that engagement happens through comments and meeting invitations, not threaded discussion
- **Region Scoping** — Berlin for now; architecture must accommodate other regions in future

## Resolved Decisions

- **Editing after publish**: Sophie can edit/remove time slots and locations as long as no invitation has been proposed for that slot.
- **Expired time slots**: Auto-archived when no valid future slots remain.
- **Re-publishing**: Sophie can re-publish an archived prompt with new time slots, whether or not a meeting happened.
- **Active prompt limit**: Yes, there is a limit. Exact number TBD.
- **Cover image**: Uploads are resized to a standard size+format by the system. Moderation approach TBD.
- **Rich text**: Keep it basic. Standard keyboard shortcuts (ctrl+b, etc.) via an established editing framework. No formatting modals or complex toolbars.
- **Meeting duration**: Preferred time slot with start time + duration. Not an availability block.
- **7-day window**: Rolling from current day. Sophie keeps prompts alive by opening new slots.

## Open Questions

- Cover image moderation: what are the options? (TBD)
- Re-publish mechanics: does it re-appear on discover as if new? (TBD)
