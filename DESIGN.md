# Design

Dyad's structural commitments.

## Why dyad is shaped this way

People in Berlin who want to meet across social categories have no coordination layer for that. Every available digital tool routes them toward affinity-based sorting, which feels like connection but reproduces the clustering that left them isolated in the first place. The crux: making stranger-meeting "easier" almost always means reducing friction through similarity matching, which accelerates the very isolation the user came in trying to address.

## Structural commitments

These are encoded in the data model, the API surface, and the UI. Some by direct enforcement (DB constraints, RLS, the absence of a feature); others by team discipline. Enforcement notes are inline where applicable.

### Coordination, not communication

The platform helps members find a time and place to meet in person. It does not mediate contact between them before the meeting. The encounter is where the conversation happens; the app is the coordination layer that gets two people to the same place at the same time.

- The meeting is analogue. Members agree on a time and place through the app, then they show up.
- One response per member per conversation. *(DB UNIQUE constraint on `prompt_comments(prompt_id, author_id)`)*
- A response is a one-way message. *(Schema absence: `prompt_comments` has no `parent_id` column.)*
- Responses are editable, with an "edited" indicator surfaced to the author.
- A member must write a response before they can invite to meet. The response is the meeting context. *(UI- and service-layer only; `prompt_invitations.comment_id` is nullable.)*
- No contact details exchanged through the platform. *(Held by review; no server-side stripping of phone numbers or emails in free-text fields today.)*
- No-show is a valid outcome. Reported in the post-meeting feedback form. No-shows trigger moderator review.
- If members meet and exchange contact info in person — great. The platform's job ends at getting them to the same place at the same time.

### Calm technology

We have tried to make the app ask very little of members' attention. Notifications and prompts appear when there's something specific to act on.

- Notifications are opt-in (email, push) and minimal by design.
- No reminder cadence. The feedback gate prevents access to the rest of the app until minimum feedback ("did the meeting happen?") is submitted, and stays in place until both members have submitted.
- The gate activates when the meeting start time passes — mid-session, not on next login.

### Anti-sorting

- Discovery is not based on interests, personality matching, or "people like you" recommendations.
- The discover page is a commons, not a feed. *(Discover queries order by `published_at DESC` only. See `src/lib/services/prompt-query.ts`.)*
- Members see each other through their prompts. There are no separate profile bios. *(Schema absence: no `bio` column on `profiles`.)*
- No follower graph. *(Schema absence: no `follows` table. A future PR adding one would need to be caught by review.)*

### Meeting cycle

- The author sets 1–3 time slots at publish time, each with start time, duration, and location. *(CHECK in `publish_prompt`: ≤3 slots, future-only.)*
- The exact location is private. The inviter sees only a general area (neighbourhood-level, derived from the exact location); the exact location is revealed when an invitation is accepted. *(Column-level grants + the SECURITY DEFINER `get_meeting_with_location` function.)*
- Confirmed time slots are hidden from non-participants. *(RLS policy in `20260409_fix_time_slots_rls_safeguarding.sql`.)*
- The inviter picks one time + place option.
- Time slots use a rolling 7-day window in the UI. *(Currently held by UI convention; the schema accepts arbitrary future dates.)*
- Time slots where a member already has an accepted meeting are hidden. *(Held by review and UI; not yet enforced server-side.)*

### Consent-free as a constraint

Any feature that would require a GDPR / ePrivacy consent modal for visitors is foreclosed by default. The consent banner is treated as a signal of drift toward third-party tracking, third-party assets, or cookie-based personalisation.

Current setup: Plausible (cookieless, EU-hosted) for analytics, self-hosted SangBleu Sunrise fonts, Leaflet with OpenStreetMap tiles, Stripe Checkout instead of embedded Stripe Elements, no social embeds.

### Admin visibility

- Members should assume admins can read anything they upload. The platform does not collect private or confidential details beyond what members agree to share. *(Service-role Supabase client bypasses RLS by design.)*

### Conversation states

Conversations move through two states: **draft** (only the author sees it) and **published** (live on the feed). *(DB CHECK: `state IN ('draft', 'published')`.)* Three author actions move between them.

- **Publish** takes a draft public. First-time publish requires the author to pick at least one time slot. Re-publish from an unpublished draft preserves the existing slots — slot management is a continuous concern, not part of the state transition.
- **Unpublish** takes a public conversation off the feed and back to draft. Slots stay attached to the conversation. Pending invitations on those slots expire (the take-down's only side effect). Active scheduled meetings are unaffected — they live on `/meetings/[id]` and the participants are committed to them regardless of where the conversation sits.
- **Delete** removes the conversation permanently.

A published conversation whose slots have all expired remains in `state='published'`. It falls out of the discover feed (which filters on slot validity) and surfaces in the author's Profile under the Past tab. The author revives it by adding a new slot. Direct links to drafts (whether never-published or unpublished) 404 for non-authors. *(RLS: `Authenticated users can read published prompts` permits only `state = 'published'`.)*
