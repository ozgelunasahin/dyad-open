---
name: dyad
last_updated: 2026-05-04
---

# dyad Strategy

## Target problem

People in Berlin who want to meet across social categories have no coordination layer for that. Every available digital tool (dating apps, Meetup, social feeds, networking apps) routes them toward affinity-based sorting, which feels like connection but reproduces the clustering that left them isolated in the first place. The crux: making stranger-meeting "easier" almost always means reducing friction through similarity matching, which accelerates the very isolation the user came in trying to address.

## Our approach

Coordination, not communication: dyad's job is to get two members to the same place at the same time around a written conversation prompt, and then get out of the way. The prompt is the emulsifier across difference; the meeting is analogue. The patterns we refuse on principle are the ones that produce the underlying problem: affinity matching, feeds, persistent contact channels, engagement metrics. Refusing them is what makes the approach a choice and not a slogan.

## Who it's for

**Primary:** A Berlin resident who wants to encounter someone outside their existing social categories. They come to dyad to coordinate one in-person meeting with a stranger, anchored to a written conversation prompt, without the affinity-matching shape of a dating app or the feed shape of social media. Curiosity is the entry condition; credentials and expertise are not.

## Key metrics

- **Meeting completion rate** — % of confirmed meetings where both parties show up and submit feedback. Measured from `meetings` + `feedback_forms`.
- **Return-after-meeting** — % of members who publish a new conversation or respond to another within 60 days of their first completed meeting. Measured from `prompts` + `prompt_comments`.
- **No-show rate** — % of confirmed meetings reporting a no-show in post-meeting feedback. Inverse signal of platform health.
- **Feedback quality distribution** — distribution of adjective-vocabulary tags across submitted feedback (positive / mixed / problematic). From `feedback_forms` + `adjective_vocabulary`.
- **Calm-tech use shape** — sessions per active member per week. Anti-engagement: 1–3 sessions/week is the target band; sustained 7+ suggests drift toward feed-shaped use. Via Plausible.

**Open questions held as ongoing conversations** (not metrics to solve):

1. **Cross-category encounter** is the deep thing the approach commits to and there is no clean way to measure it without violating anti-sorting.
2. **What data do we need to collect to keep our users safe?** (Frame from Sarell, sarell.tech.) Sits in tension with dyad's data-minimisation posture; held as a permanent open thread that any data-collection or feature decision passes through.
3. **Feedback quality distribution** assumes the adjective vocabulary partitions cleanly. Worth checking whether the actual tags do that.

## Tracks

### Coordination flow quality

The prompt → response → invitation → meeting → feedback engine, including the editor, scheduling, location handling, slot mechanics, and feedback forms.

_Why it serves the approach:_ Direct execution of "coordination, not communication." This is the function the approach commits the product to.

### Non-extractive architecture

The architectural commitments that prevent the platform from sliding into the patterns it refuses: the upact identity port, consent-bound enrichment, payment as a delegated substrate, OSS licensing, and groundwork for steward-ownership of the legal entity.

_Why it serves the approach:_ Makes the refusal structural rather than aspirational. The architecture is what stops product pressure from quietly turning dyad into the thing it was built against.

### Berlin community

The practice of actually being a Berlin community: member curation, anchor-venue partnerships, in-person presence, and growth that respects the size the platform should be at.

_Why it serves the approach:_ A coordination tool with no curated members produces no encounters. The community work is what keeps meeting quality high enough that members come back.

### Safeguarding discipline

Feedback gate, no-show handling, cancellation symmetry, moderator review, and the ongoing safety-data conversation (Sarell's question).

_Why it serves the approach:_ Without safeguarding, "encounter, not efficiency" becomes irresponsible exposure of strangers to strangers. This track is what makes the rest of the approach safe to actually pursue.

## Not working on

- **Cross-posting to the fediverse or any open-graph social surface.** Importing handle-shaped contact identifiers conflicts with upact's privacy minima and would slide dyad toward the feed dynamics it exists to refuse. Login-only via OIDC is fine; cross-posting and auto-filled handles are not.
- **Affinity matching or interest-based discovery.** Every "make discovery easier" instinct routes through similarity, which is the local minimum the approach commits to refusing. The discover surface stays a commons.
- **Engagement-shaped metrics and push-driven retention.** DAU, time-in-app, notification-driven returns. Calm-tech use shape is the metric; engagement is the symptom of failure.
- **Ad-supported or data-resale revenue.** Architecturally foreclosed by the privacy stack; named here because the temptation returns whenever revenue pressure mounts.
- **Cross-application reputation or portable scoring.** Importing or exporting safety signals across applications would require persistent identifiers the architecture refuses. Application-local feedback gates and curated membership are the substitutes.
- **Consent dialogs as a substitute for non-collection.** The dominant cookie-banner pattern (TCF and TCF-shaped CMPs) has been judicially confirmed as failing the consent standard it claims to satisfy (Belgian DPA 2022 / Brussels Market Court 2025) and empirically documented as manipulative (Forbrukerrådet *Deceived by Design* 2018; CHI 2021). Asking for consent inside that frame does not produce consent. dyad's posture is to refuse the pattern: any feature that would only ship with a consent banner attached is treated as a signal the system is asking for the wrong thing. The principle is documented in `DESIGN.md` § *Consent-free as a constraint*.
