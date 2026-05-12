# Design

Dyad's structural commitments.

## Why dyad is shaped this way

People in Berlin who want to meet across social categories have no coordination layer for that. Every available digital tool (dating apps, Meetup, social feeds, networking apps) routes them toward affinity-based sorting, which feels like connection but reproduces the clustering that left them isolated in the first place. The crux: making stranger-meeting "easier" almost always means reducing friction through similarity matching, which accelerates the very isolation the user came in trying to address.

## Structural commitments

These are encoded in the data model, the API surface, and the UI.

### Coordination, not communication

The platform helps members find a time and place to meet in person. It does not mediate contact between them before the meeting. The encounter is where the conversation happens; the app is the coordination layer that gets two people to the same place at the same time.

- The meeting is analogue. Members agree on a time and place through the app, then they show up.
- No contact details exchanged through the platform. Free-text fields may need stripping enforcement.
- Responses are allowed without inviting. A member can leave one response on a conversation without sending an invitation. This is a single message to the author, not a messaging channel. Responses are editable (with an "edited" indicator). One response per member per conversation.
- No threading, no replies, no back-and-forth. A response is a one-way message. If the responder later decides to invite, the invitation flow picks up from there.
- A member must write a response before they can invite to meet. The response is the meeting context.
- No-show is a valid outcome. Reported in the post-meeting feedback form. No-shows trigger moderator review.
- If members meet and exchange contact info in person — great. The platform's job ends at getting them to the same place at the same time.

### Calm technology

We have tried to make the app ask very little of members' attention. Notifications and prompts appear when there's something specific to act on.

- Notifications are opt-in (email, push) and minimal by design.
- No reminder cadence. The feedback gate prevents access until at least minimum feedback (did the meeting happen?) is submitted. The gate activates when start time passes (mid-session, not on next login).
-  If a member never submits feedback, they remain gated.

### Anti-sorting

- No interest matching. No personality tests. No "people like you" recommendations.
- The discover page is a commons not a feed.
- Members see each other through their prompts. There are no separate profile bios.
- If "following" is ever introduced, it must not influence discover ordering.

### Meeting cycle

- The author sets 1–3 time slots at publish time, each with start time, duration, and location.
- Time slots use a rolling 7-day window. A prompt with no future slots falls out of the discover feed but stays in the author's profile under Archive.
- The exact location is obfuscated by default. The inviter sees only a general area (neighbourhood-level, derived from the exact location); the exact location is revealed when an invitation is accepted.
- Confirmed time slots are hidden from non-participants (RLS-enforced).
- The inviter picks one time+place option. 
- Time slots where a member already has an accepted meeting are hidden; no double-booking (open for discussion)

### Consent-free as a constraint

- Any feature that would require a GDPR / ePrivacy consent modal for visitors is foreclosed by default. The consent banner is treated as a signal of architectural drift toward third-party tracking, third-party assets, or cookie-based personalisation.
- Current setup: Plausible (cookieless, EU-hosted) for analytics, self-hosted SangBleu Sunrise fonts, Leaflet with OpenStreetMap tiles, Stripe Checkout instead of embedded Stripe Elements.

### Admin visibility

- Members should assume admins can read anything they upload. The platform does not collect private or confidential details beyond what members agree to share.

### Conversation states

Conversations move through two states: **draft** (only the author sees it) and **public** (live on the feed). Three author actions move between them.

- **Publish** takes a draft public. First-time publish requires the author to pick at least one time slot. Re-publish from an unpublished draft preserves the existing slots — slot management is a continuous concern, not part of the state transition.
- **Unpublish** takes a public conversation off the feed and back to draft. Slots stay attached to the conversation. Pending invitations on those slots expire (the take-down's only side effect). Active scheduled meetings are unaffected — they live on `/meetings/[id]` and the participants are committed to them regardless of where the conversation sits.
- **Delete** removes the conversation permanently.

A published conversation whose slots have all expired remains in `state='published'`. It falls out of the discover feed (which filters on slot validity) and surfaces in the author's Profile under the Past tab. The author revives it by adding a new slot. Direct links to drafts (whether never-published or unpublished) 404 for non-authors.

