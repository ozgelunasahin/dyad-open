# Design Principles

Cross-cutting decisions that shape multiple stories.

## Why This Exists

People come to dyad seeking safety, validation, belonging. The comfortable path to these is through affinity — finding people like you, forming cliques, retreating into shared language. This is the local minimum: it feels like connection but it reproduces the sorting that isolates us in the first place.

The deeper need — across seekers, explorers, gatherers, and in-betweeners (see `docs/design/user-archetypes.md`) — is for a way to be with others that cuts across the categories we've been sorted into. Not "authentic connection" (a phrase that has been emptied of meaning), but the practice of encountering someone outside your category and discovering that the ground between you is more solid than you expected.

Dyad's structural choices — no interest matching, no similarity algorithms, a commons not a feed, shared questions not shared identities — are not UX preferences. They are an attempt to build social infrastructure that cross-links rather than clusters. The conversation prompt is the emulsifier: it creates an interface where different people can be in contact, not by dissolving difference but by giving it a surface to meet across.

Every feature that makes the platform "easier" by reducing friction through sorting (interest tags, personality matching, "people like you") accelerates the very isolation the platform exists to address. Efficiency is not the goal. The goal is encounter.

## Enabler, Not Replacement

Dyad builds tools and infrastructure to help people build and develop diverse, intersected communities within cities. It is an enabler of in-person community, not a replacement for it. Every design decision should be evaluated against this: does it get people into the same room, or does it give them a reason to stay on their screens?

## No Pre-Meeting Contact

The platform deliberately does not provide any way for two users to exchange contact details or coordinate before meeting in person.

- **The meeting is analogue.** You agree on a time and place through the app, then you show up. Like the old days.
- **No contact details exchanged through the platform.** This may need to be enforced (e.g. stripping phone numbers/emails from free text fields).
- **Comments are allowed without inviting.** A user can leave one comment on a prompt without sending an invitation. This is a single response to the starter, not a messaging channel. Comments are editable (with an "edited" indicator). No limit on how many prompts a user can comment on — but the platform tracks this metric.
- **No threading, no replies, no back-and-forth.** A comment is a one-way message. If the commenter later decides to invite, the invitation flow picks up from there.
- **No-show is a valid outcome.** If the other person doesn't arrive, you go home. You report this in the feedback form ("Did this meeting take place? If no, why not?").
- **No-show triggers moderator review.** The platform follows up if necessary. Both parties reporting no-show also triggers moderation.
- **If they meet and exchange contact info in person — great.** The platform's job ends at getting them to the same place at the same time.

## Healthy Brain / Minimal Notifications

The platform follows a "healthy brain" approach — push as little information at the user as possible.

- **Notifications are opt-in** (email, push) and minimal by design.
- **The app itself is the primary surface.** Feedback prompts, meeting updates, etc. appear when you open the app, not as pings demanding attention.
- **Feedback gate is a hard line.** No access to the app at all until at least the minimum feedback is given. The gate activates immediately when the meeting start time passes (not on next login — immediately mid-session). Multi-step gating to reduce friction while ensuring thoughtful, authentic feedback is TBD for later.
- **No reminder cadence.** If a user never submits feedback, they simply remain gated. The other party never sees their feedback. The blocking is the reminder.

## Reputation & Trust

Reputation is surfaced through profile information visible when someone considers inviting you or accepting your invitation.

- **Reputation is profile-visible, not score-based.** It's expressed through feedback, testimonials, and behavioural signals — not a number.
- **Maybe 1 free pass** on cancellations/no-shows before any visible reputation mark. Not a "grace period" — just acknowledging that things happen.
- **Not a blacklist.** Bad behaviour makes you less attractive to others through visible signals, but doesn't hard-block you from the platform.
- **Community is self-moderating through structure.** The feedback gate, reputation visibility, and invitation-based engagement mean the community naturally filters for reliability. Moderator intervention should be minimised.
- **Cancellation history, no-show history, and feedback quality** all contribute to what others see when evaluating you.
- **The user controls which received feedback to display** (from Story 4), but cancellation/no-show signals may not be hideable.
- **Credibility is built over time.** Deleting an account to escape bad reputation isn't viable — marks are associated with the email address, and a fresh account starts with zero credibility.

## Comments Are Private, Single-Shot Messages

When users engage with a prompt on the discover page, their comment is a private one-way message to the starter — not a public thread.

- **Commenters don't see each other's comments.** Each comment is a private channel between the commenter and the starter.
- **Comments can be sent without an invitation.** One comment per user per prompt. Editable (with "edited" indicator).
- **Multiple people can comment and/or invite** on the same prompt.
- **The starter sees all comments and invitations** and can choose between them.
- **Once a meeting is scheduled for a time slot, that slot is hidden** from other users. The prompt remains visible with its other available slots. If all slots are booked or expired, the prompt is archived.

## Location & Time Slots

- **Starter sets 1–3 time slots** at publish time, each with a preferred start time, duration, and location.
- **Time slots use a rolling 7-day window.** Sophie keeps a prompt alive by opening new time slots. Without activity (no valid future time slots), the prompt is archived and requires re-publishing.
- **Preferred time slot, not availability block.** Keep the interface simple — a specific start time and duration, not a range of availability. May be reviewed based on usage.
- **Locations are selected from a location API** (autocomplete dropdown), scoped to the app instance region (Berlin for now, other regions in future).
- **Easy carry-over**: option to apply the same location to all time slots without re-entering.
- **Exact location is private.** The system generates a general area (like Airbnb) from the exact location — e.g. postcode or neighbourhood. The inviter sees the general area; exact location is revealed only after confirmation.
- **The inviter picks ONE time+place option.** No negotiation. If the starter accepts, that's the meeting. It's scheduled.
- **Meeting duration** is set by the starter (start time + duration per slot). Used for calendar events and feedback gate timing. Actual time spent is up to the participants.
- **Time slots where the user already has an accepted meeting are hidden.** A user cannot have multiple meetings scheduled at the same time.
- **Sophie can accept invitations for multiple time slots** (one per slot). Once accepted, that slot is no longer displayed to other users.

## Cancellation & Deletion

- **Cancellation is symmetric.** Both starters and inviters can cancel. Same tiers apply to both parties.
- **Withdrawing an invitation before it is accepted is a free action.** No explanation required, no consequences.
- **Invitations expire 12 hours before the meeting start time** if not responded to.
- **Unpublishing a prompt** is allowed. Active invitations are resolved according to the cancellation policy.
- **Account deletion** releases the other party from feedback gate. Treated under the same cancellation rules (auto-generated cancellation message): no penalty if >=12h before meeting, reputation mark if <12h. Mark is associated with the user's email address. Deleted profiles are soft-deleted in the database with an appropriate personal data retention period.

## Prompt Lifecycle

- **Prompts can be re-published** by the author with new time slots, whether or not a meeting previously took place.
- **After a completed meeting**, the prompt is archived. Both participants can see it in their private profiles and can choose to show feedback/info on their public profiles.
- **Rolling 7-day window.** Without activity (no valid future time slots), the prompt is auto-archived. Sophie must re-publish to reactivate.

## Slot-Blocking Concern (Follow-Up Needed)

A user could accept invitations across many prompts to block time slots, then cancel just before the 12h window — blocking up to 6.5 days of availability for other potential inviters without consequence. This leans toward starters being deliberate about accepting. They can receive many invitations for the same slot before choosing one. Accepting should be a full commitment. A response window may help. To be revisited based on usage.

## Regional Presence

The app is scoped to a region (Berlin for now). Users need to be in the region to meaningfully use the platform, but verifying this is hard without compromising accessibility or privacy.

- **No location data requirement.** We cannot require users to share location or avoid VPNs.
- **No official residence checks.** Many people in Berlin have complicated residence situations — this would be exclusionary.
- **Meeting locations as soft verification.** Only allowing meeting locations within Berlin partly solves this — you'd only use the app if you can show up.
- **Creative verification options to explore.** E.g. scan a QR code at a physical location in the city as lightweight proof of presence.
- **Must balance trust, accessibility, and privacy.**

## Admin Visibility

- **Admins can see everything.** All prompts, invitations, feedback, profiles.
- **Users should assume admins can read anything they upload.** The platform does not collect private or confidential details beyond what users agree to share.
- **Admins can**: edit/remove prompts, suspend users, force-cancel meetings, see "share with platform" feedback, manage moderation cases.

## Minimise Friction

- Registration and onboarding should have as little friction as possible.
- Invite links are time-bound but resilient — if a session drops mid-registration, the same link works to resume. One account per link, not one use per link.

## Anonymity & Identity

- Users should be able to protect their anonymity. Usernames should not be given too much importance.
- The platform needs to balance trust (reputation, feedback, showing up) with the right to pseudonymity.

## No Tutorial Modals

- Onboarding should NOT be a guided tour with modals highlighting UI elements. This is an anti-pattern.
- Inducting users into platform norms should happen more organically. Approach TBD.

## Alignment with [Rebuild](https://rebuild.net) Design Framework

Mapping of Dyad's design decisions against the Rebuild documents: Design Principles v0.8, Social Design Framework v0.8.5, and Social Needs Map v0.8.

### Rebuild Design Principles

**"Do what you say, say what you do."** The entire architecture is transparent about what it does: it connects you with someone, gets you to the same place at the same time, and gets out of the way. There are no hidden engagement mechanics. The feedback gate is a hard, visible rule. Admin visibility is stated plainly. Cancellation tiers are explicit and symmetric. There is no gap between what the platform claims to do and what it structurally does.

**"Design intentional participation."** Almost every design decision forces intentional action. No pre-meeting contact: you commit to showing up without being able to coordinate. Comments are single-shot, private, one-way. The inviter picks ONE time and place with no negotiation. The feedback gate locks the entire app until you've reflected on what happened. No reminder cadence; the blocking is the reminder. Minimal notifications, opt-in only. The app doesn't chase you.

**"Cultivate richness over reach."** Region-scoped (Berlin for now). The rolling 7-day window on prompts means content naturally cycles rather than accumulating. Active prompt limit (number TBD). One meeting at a time, one slot at a time, one comment per prompt. Depth over breadth by construction.

**"Build a legacy of kindness."** Reputation is visible feedback and testimonials, not a score. The user controls which received feedback to display. Reputation marks for no-shows are soft signals, not blacklists. Simultaneous feedback reveal prevents retaliation. "Maybe 1 free pass" on no-shows acknowledges that things happen. Adjective vocabulary for describing meeting partners is curated, constraining language toward description rather than attack.

### Social Design Framework Dimensions

1. **Social Object:** The prompt (rich text + cover image + meeting availability). Well-defined lifecycle: published, engaged, scheduled, met, archived, optionally republished.
2. **Platform Intent:** Experience-driven (ROX). No visible business model. Design oriented entirely around the quality of the meeting experience.
3. **Identity:** Deliberately minimal. Users can protect their anonymity. Usernames are not given importance. Identity accrues through reputation: feedback, testimonials, showing-up history. Identity built through action rather than self-declaration.
4. **Conversations:** Radically constrained. Single-shot private comments, no threading, no replies. The actual conversation happens in person.
5. **Sharing:** Content is the prompt itself. No resharing, no virality mechanics. Content doesn't propagate; it sits on the discover page and map until its slots expire.
6. **Presence:** Inverted. No online/offline status. Presence is physical: you prove you're present by showing up. Regional verification via physical-world signals (e.g. QR codes at locations) is consistent with this.
7. **Relationships:** The platform does not push users toward persistent digital relationships. Following profiles is supported as a lightweight way to stay connected within the platform, and users can schedule repeat meetings. Some people may not want to exchange phone numbers, some may not carry phones at all. The relationship can live entirely within the platform through shared meeting history and feedback, or it can move outside the platform if both people choose that. Neither outcome is privileged.
8. **Reputation:** Profile-visible, not score-based. Built through feedback, testimonials, and behavioural signals. Quality over popularity.
9. **Groups:** Not in scope currently. The platform is designed around one-to-one encounters. Group meetups may become a natural extension in the future, but the core design is built for dyadic connection first.
10. **Agency:** High in some ways (user controls feedback display, opt-in notifications, full cancellation rights), constrained in others (feedback gate is non-negotiable, no pre-meeting contact, no negotiation on meeting terms). The constraints are the design.

### Social Needs Map

Dyad directly addresses:
- **"Meeting places"** (Meso/Now): "I feel there is nowhere to go and meet new people physically."
- **"Human touch (loneliness)"** (Meso/Now): "I feel disconnected. I need bodily presence and true human interaction."
- **"Trust in the realness of people"** (Self/Now): "I feel I am listening to bots." Dyad solves this by making the endpoint a physical meeting.
- **"Inner social life"** (Self/Now): "I'm afraid of losing my inner life, concentration and deep thinking." The healthy brain / minimal notifications design addresses this directly.
- **"Mental health and overload"** (Micro/Future): "I feel fed up. I need silence." Dyad is a quiet app by design.
- **"Intergenerational connection"** (Micro/Now): The platform doesn't age-gate or segment by demographic.
- **"Belonging"**: Dyad builds tools and infrastructure to help people build and develop diverse, intersected communities within cities. It is an enabler of in-person community, not a replacement for it. The comment-without-invitation flow allows low-stakes meaningful participation without committing to a meeting.

## Inclusive Language

The core value is supporting diverse, interconnected communities. Diversity across many dimensions (background, interests, identity, age, profession) must be actively encouraged — in the product and in how we describe it.

- **Avoid intellectualism signals.** Language like "independent thinkers" or "meet through writing" creates invisible barriers. Not everyone identifies as a "thinker" — but everyone can benefit from genuine conversation.
- **Test copy against the question:** Would a nurse, a barista, a retiree feel addressed by this language? If not, rewrite.
- **The platform is for people who want connection**, not for people who want to be seen as intellectual.
- **Curiosity, not expertise.** Prompts should invite exploration, not signal that you need to be well-read to participate.
