# Dyad and the Open Infrastructure Ecosystem

Where Dyad's design meets (and doesn't meet) the questions of interoperability, shared infrastructure, open protocols, and open source.

This document maps the intersections, not to prescribe answers but to lay out the decisions that need to be made. Some of these are architectural choices with long-term consequences. Others are philosophical positions about what kind of platform Dyad is.

## Context

The European social platform ecosystem is coalescing around a set of shared concerns: portable identity, federated protocols (ActivityPub, AT Protocol), shared moderation infrastructure, data portability, and EU regulatory compliance (DMA, DSA, GDPR). The Rebuild community and adjacent organisations (FediForum, W3C Social CG, Social Web Foundation, IFTAS) are working on these at various levels.

Dyad is a deliberately bounded platform. It is scoped to a region, oriented around physical meetings, and designed with constraints that resist the usual platform growth dynamics. The question is not "should Dyad federate like Mastodon" but rather "which parts of the open infrastructure ecosystem are useful to Dyad, which parts can Dyad contribute to, and where does Dyad's bounded design make interop irrelevant or counterproductive."

## Identity

Dyad's identity model is minimal and reputation-based. Users can be pseudonymous. Identity accrues through action (showing up, giving feedback, building a history) rather than self-declaration.

**Intersections:**

- **Portable identity (DIDs, did:web, did:plc).** Dyad's reputation is the most valuable thing a user builds on the platform. If a user leaves Dyad, can their reputation travel with them? Should it? A DID could provide a stable identifier that persists across platforms, so that a user's Dyad history is legible elsewhere. But Dyad's reputation is contextual — "reliable conversation partner who shows up in Berlin" means something specific that may not translate to other contexts.

- **Verifiable Credentials.** Dyad's feedback and reputation signals could be expressed as verifiable credentials: "this person has completed N meetings with an average feedback quality of X." This would make Dyad reputation portable without exposing the raw feedback. Whether this is desirable depends on whether Dyad wants its reputation to be an exportable asset or a platform-specific quality.

- **Authentication.** Dyad currently uses email-based registration with admin approval. OpenID Connect or a shared European identity layer (eIDAS 2.0 wallets) could replace or supplement this. The regional verification problem (how do we know you're in Berlin?) might benefit from identity infrastructure that includes location attestations.

- **Account portability.** If Dyad runs regional instances (Berlin, then other cities), can a user who moves from Berlin to Amsterdam carry their identity and reputation to a different instance? This is the same problem ActivityPub has with server-bound identity, and the same problem AT Protocol solved with DIDs.

**Open question:** Does Dyad need portable identity, or is platform-bound identity a feature? The answer may differ for identity (yes, portable) and reputation (maybe not — context matters).

## Regional Instances and Federation

Dyad is scoped to Berlin for now, with architecture designed to accommodate other regions. This is the most natural intersection with federation.

**Intersections:**

- **Each city as an instance.** A Berlin Dyad, an Amsterdam Dyad, a Lisbon Dyad. Each with its own community, its own conversations, its own discover page. This maps naturally to the fediverse model of independent instances with optional federation.

- **What would federation mean here?** Not following someone in another city (you can't show up for a meeting there). But: carrying your identity and reputation across instances when you travel or move. Seeing conversations in another city when you're visiting. A shared moderation layer so that someone banned from Berlin Dyad for repeated no-shows is visible to Amsterdam Dyad admins.

- **What federation would not mean:** A global discover page. Cross-city meeting scheduling (the whole point is physical presence). Aggregated feeds. The things federation usually enables in social platforms are precisely what Dyad's design rejects.

- **Protocol choice.** ActivityPub is designed for content federation (posts, follows, boosts). Dyad's core object is a conversation with attached meeting availability — this doesn't map cleanly to ActivityPub's Note/Article model. AT Protocol's Lexicon system is more flexible (define your own record types), but brings infrastructure cost and Bluesky dependency. A lighter approach might be a shared identity layer (DIDs) and a custom sync protocol between Dyad instances, without adopting a full social networking protocol.

**Open question:** Is federation between Dyad instances the right frame, or is it simpler to run one platform with regional scoping built in?

## Data Portability

Dyad stores: user profiles, conversations (rich text + images), meeting history, feedback given and received, reputation signals, cancellation history.

**Intersections:**

- **EU Data Act / GDPR right to data portability.** Users have the right to export their data. Dyad should support this regardless of interop ambitions. What format? A JSON export of profile, conversations, and feedback history is the minimum.

- **Portable reputation.** The most interesting portability question. If a user has built a strong reputation on Dyad Berlin (reliable, thoughtful, shows up), is there a way to carry that to another platform that values similar qualities? Verifiable Credentials are the technical mechanism. The design question is whether Dyad wants to be an issuer of reputation credentials.

- **Content portability.** Conversations are authored content. Could they be published to the fediverse as well as to Dyad's discover page? A conversation with meeting availability attached could be expressed as an ActivityPub object. Whether this makes sense depends on whether Dyad conversations are meaningful outside the context of the platform's constraints (feedback gate, reputation, single-shot comments).

**Open question:** What is the minimum viable data export, and what (if anything) should be interoperable beyond that?

## Moderation

Dyad's moderation model is structural: the feedback gate, reputation visibility, and invitation-based engagement mean the community self-moderates. Moderator intervention is minimised by design.

**Intersections:**

- **IFTAS and shared moderation intelligence.** If Dyad runs multiple instances, sharing moderation data between them (repeated no-shows, banned users) is important. IFTAS's CARIAD framework and FediCheck service are designed for exactly this kind of cross-instance moderation data sharing.

- **Content moderation tooling.** Dyad's content is conversations (rich text + cover images). Cover image moderation is an open question in the design docs. Shared tooling for image classification (CSAM detection, spam detection) is something the broader ecosystem is building and Dyad shouldn't reinvent.

- **The labeller model.** Bluesky's labeller architecture (independent services that attach labels to content, users choose which to subscribe to) is interesting for Dyad's regional context. A Berlin-specific labeller could flag content that doesn't fit local community norms. But this may be overengineering for a platform where moderation is already structural.

**Open question:** Where does Dyad's structural moderation reach its limits, and what shared tooling fills the gaps?

## Shared Infrastructure

Parts of Dyad's stack that could use or contribute to shared infrastructure:

- **Authentication.** OpenID Connect, potentially eIDAS 2.0 wallets. Shared auth reduces friction for users who are on multiple European platforms.

- **Location services.** The location API (autocomplete, region scoping, general area generation) is not Dyad-specific. Other platforms that deal with physical meetups need the same thing. Could be a shared service.

- **Calendar integration.** The "add to calendar" flow (.ics generation, Google/Outlook deep links) is commodity. No need to build this from scratch.

- **Media hosting.** Cover image storage and CDN. If Dyad participates in a shared European platform infrastructure, pooled media hosting (like the Jortage experiment in the fediverse) would reduce costs.

- **Regional verification.** The unsolved problem of verifying that a user is in Berlin without compromising privacy. Any solution Dyad develops for this would be valuable to other regional platforms. This is a contribution Dyad could make to the shared infrastructure ecosystem.

## Open Source

**Intersections:**

- **Should Dyad be open source?** The Rebuild community values open source — Rebuild itself will open-source all frameworks and tools when it closes in December 2026. The design principles and stories are already being developed in the open (documented, versioned, CC BY 4.0 for Rebuild materials).

- **Which parts?** The design documents and user stories are already shareable. The code could be open-sourced fully, or selectively (e.g. the location service, the feedback/reputation system, the calendar integration as standalone components that other platforms could use).

- **Regional forks.** If Dyad is open source, other communities could run their own instances for their own cities. This is the "federation through forking" model — not protocol-level interop, but the same software adapted to local context.

## EU Regulatory

- **DSA.** Dyad's current scale is well below DSA thresholds. The admin-approved registration model and structural moderation (feedback gate, reputation) may satisfy notice-and-action requirements at small scale. If Dyad grows, shared DSA compliance tooling from the broader ecosystem would be useful.

- **DMA.** Not directly applicable at current scale. But if the 2026 DMA review expands interoperability requirements to social platforms broadly, Dyad would need to understand what that means for a platform designed around physical meetings.

- **GDPR.** The soft-deletion model for accounts is already in the design docs. Feedback associated with email addresses after account deletion needs careful handling. The feedback gate (holding one party's app hostage until the other submits feedback) has GDPR implications if the non-submitting party deletes their account — this is already addressed in the design (account deletion releases the other party).

## What Dyad Could Contribute

Dyad's design is unusual enough that several of its patterns could be valuable to the broader ecosystem:

- **The feedback gate pattern.** A mechanism for ensuring reflective, non-retaliatory feedback. Other platforms dealing with trust (marketplace platforms, community platforms) could adapt this.

- **Structural moderation.** The idea that community health comes from design constraints rather than content policing. This is a contribution to the moderation conversation that goes beyond tooling.

- **Physical-presence verification.** Whatever solution Dyad develops for the regional verification problem is applicable to any platform that cares about physical locality.

- **Reputation without scores.** A model of reputation built from testimonials and behavioural signals rather than numerical ratings. Applicable to any platform where trust matters.

## Summary of Open Questions

1. Does Dyad need portable identity, or is platform-bound identity a feature?
2. Is federation between regional instances the right frame, or is regional scoping within a single platform simpler?
3. What is the minimum viable data export for portability compliance?
4. Should Dyad reputation be exportable as verifiable credentials?
5. Where does structural moderation reach its limits?
6. Should Dyad be open source, and if so, which parts?
7. What protocol (if any) should Dyad adopt for cross-instance communication?
