# Story 4: Meeting, Feedback & Reputation

After Sophie confirms, Tom prepares for the meeting. After the meeting takes place, both parties give feedback. Feedback is revealed simultaneously and feeds into profile reputation. The app is fully gated until feedback is submitted.

## Pools & Lanes

### Tom

1. **Start Event** — Receives confirmation (from Story 2)
2. **Task** — Views scheduled meeting details (e.g. "19:00 at Mokofuk" — exact location now revealed)
3. **Task** — Views cancellation policy (12-hour window; reputation consequences)
4. **Task** — (Optional) Adds to calendar
5. **Exclusive Gateway** — Cancel?
   - *Cancel ≥12h before* → **Task** — Must provide free-text explanation → **Task** — Cancels; prompt reappears on discover/map; explanation logged for moderation patterns → **End Event** (side flow)
   - *Cancel <12h before / no-show* → reputation mark (maybe 1 free pass, then visible on profile; repeated cancels/no-shows trigger moderation) → **End Event** (side flow)
   - *No* → continues
6. **Task** — Shows up at agreed time and place (no pre-meeting contact; no way to coordinate on the day)
7. **Task** — Meets Sophie
8. **Task** — They have a conversation
9. **Task** — Conversation ends, they part ways
10. **Intermediate Timer Event** — Meeting start time passes (gate activates immediately, even mid-session)
11. **Task** — App fully gated: no access until minimum feedback is given
12. **Task** — Fills out feedback form:
    - Did the meeting take place? If no — why not? (branches to no-show sub-flow → moderator review)
    - How was it?
    - What do you think of Sophie as a meeting partner? (select from adjectives + free text)
    - What to share with Sophie
    - What to share with the platform
    - Any comments for the platform
13. **Task** — Submits feedback
14. **Intermediate Event (wait)** — Waits for Sophie's feedback (app remains gated)
15. **Intermediate Message Event (catch)** — Both feedbacks submitted
16. **Task** — Views Sophie's feedback (only the "share with Tom" portion)
17. **Task** — Chooses whether to show Sophie's feedback on his profile
18. **End Event** — Feedback complete; app unlocked; can explore again

### Sophie

Sophie has the same cancellation options as Tom (symmetric). Her post-meeting flow mirrors Tom's:

1. **Start Event** — (Cancellation gateway mirrors Tom's steps 3-5, same tiers)
2. **Intermediate Timer Event** — Meeting start time passes (gate activates immediately)
3. **Task** — App fully gated: no access until minimum feedback is given
4. **Task** — Fills out same feedback form (about Tom)
5. **Task** — Submits feedback
6. **Intermediate Event (wait)** — Waits for Tom's feedback (app remains gated)
7. **Intermediate Message Event (catch)** — Both feedbacks submitted
8. **Task** — Views Tom's feedback
9. **Task** — Chooses whether to show Tom's feedback on her profile
10. **End Event** — Feedback complete; app unlocked; can explore again

### System

1. **Task** — Displays scheduled meeting details (exact location) + cancellation policy
2. **Task** — Generates calendar event link
3. **Task** — Handles cancellation requests (either party, symmetric):
   - ≥12h before: cancels meeting, reactivates prompt on discover/map, logs explanation
   - <12h before / no-show: applies reputation mark (maybe 1 free pass, then visible on profile)
4. **Timer Event** — At meeting start time, fully gates both users' apps immediately. Feedback can be given immediately (e.g. no-show after 15 minutes, short meeting). Editable until both parties have submitted.
5. **Task** — Presents feedback form to both parties
6. **Exclusive Gateway** — "Did the meeting take place?"
   - *No (no-show)* → **Task** — Captures reason → **Task** — Routes to moderator for review
   - *Yes (meeting happened)* → continues normal feedback flow
7. **Task** — Receives and holds each party's feedback
8. **Exclusive Gateway** — Both submitted?
   - *No* → continue holding; other party's app remains gated
   - *Yes* → **Task** — Simultaneously reveals "share with other" portions
9. **Task** — Routes "share with platform" feedback to admin/internal
10. **Task** — Updates profiles with chosen-to-display feedback
11. **Task** — Unlocks app for both users
12. **Task** — Archives prompt; visible in both participants' private profiles

## Key Domain Concepts

- **No Pre-Meeting Contact** — No way to coordinate, send directions, or confirm attendance. You show up or you don't. (See Design Principles)
- **Cancellation is Symmetric** — Both starters and inviters can cancel. Same tiers apply to both parties.
- **Cancellation Tiers**:
  1. *Pending invitation* (before acceptance) — free action, no consequences
  2. *Confirmed meeting, ≥12h before* — requires free-text explanation; logged for moderation pattern detection
  3. *Confirmed meeting, <12h before / no-show* — reputation consequences (maybe 1 free pass, then visible on profile). Repeated cancels/no-shows trigger moderation.
- **Account Deletion** — Treated as cancellation (auto-generated message). No penalty if ≥12h. Releases other party from feedback gate. Reputation mark associated with email address. Soft-deleted profile kept with retention period.
- **Reputation Mark** — Maybe 1 free pass on cancellations/no-shows. Not a blacklist but visible signals. Repeated cancels/no-shows trigger moderation. Credibility built over time; deleting account to avoid reputation isn't viable. (See Design Principles)
- **No-Show Flow** — Feedback form branches on "did it take place?"; if no, captures reason and routes to moderator. Both parties reporting no-show also triggers moderation.
- **Moderator Review** — Triggered by no-show reports and repeated bad behaviour. Platform aims to minimise moderator workload; community self-moderates through structure.
- **Feedback Form** — Dual-audience (other person vs. platform). Adjective selection + free text.
- **Simultaneous Reveal** — Neither party sees feedback until both have submitted (prevents retaliation bias)
- **Feedback Gate** — Hard line: full app gated from meeting start time (immediately, even mid-session). No access at all until minimum feedback is given. Editable until both parties have submitted. A moderator can intervene if there is a compelling reason to ungate. Multi-step gating to reduce friction while ensuring thoughtful feedback is TBD for later.
- **Profile Testimonials** — User controls which received feedback appears on their profile. Can change visibility at any time.
- **Prompt After Meeting** — Archived. Visible in both participants' private profiles. Sophie can re-publish with new time slots.

## Links to Other Stories

- **Story 2**: This story picks up where Story 2 ends (meeting scheduled)
- **Story 2, Sophie's lane**: Sophie's profile (prompts, testimonials) that Tom previews in Story 2 is built from feedback collected here
- **Story 3**: After feedback gate clears, both users return to the discover page (Story 2/3 entry point)
- **Story 3**: If meeting is cancelled ≥12h before, prompt reappears on discover/map (Story 3 lifecycle)
- **Story 3**: After meeting + feedback, Sophie can re-publish the prompt with new time slots

## Resolved Decisions

- **Repeated no-shows/bad behaviour**: Triggers a block requiring moderator interaction to resolve.
- **One party never submits feedback**: The other party remains gated. A moderator can be invoked if there's a compelling reason.
- **Account deletion during feedback**: Releases the other party from feedback gate. Auto-cancellation rules apply.
- **Editing feedback**: Yes, feedback can be edited after submission but before the other party submits.
- **Adjective vocabulary**: Curated by admins as a starting set, evolved over time.
- **Both report no-show**: Triggers moderation.
- **Cancellation symmetry**: Both parties can cancel with the same tiers.
- **Gate activation**: Immediate when meeting start time passes, even mid-session.
- **Duration UI**: Preferred time slot (not availability block). Keep simple, review per usage.

## Open Questions

- Multi-step feedback gating to reduce friction — TBD for later, not now.
