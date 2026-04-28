---
title: Interoperability and Shared Infrastructure — Deep Review
date: 2026-04-17
status: current
relates_to:
  - docs/research/interoperability-and-open-infrastructure.md
  - docs/design/shared-infrastructure-opportunities.md
  - docs/design/shared-infrastructure-review-2026-03-25.md
  - docs/solutions/architecture/sovereignty-lessons-learned.md
---

# Interoperability and Shared Infrastructure — Deep Review

A systems-architect pass over the existing interop research, the codebase, and the external ecosystem (April 2026). Scope: what to adopt now, what to defer, and where a small values-aligned platform like Dyad could strategically *contribute* new open infrastructure in collaboration with the Rebuild-adjacent community.

## Relation to existing research

The existing docs (`interoperability-and-open-infrastructure.md`, `shared-infrastructure-opportunities.md`, the `2026-03-25` review) lay out principles, a sovereignty scorecard, and a set of open questions. This review is meant to *close* several of those questions with concrete technical recommendations, add a realistic external map, and propose a sequenced work plan tied to the 2026 ecosystem calendar. It is not a replacement — it is the next layer.

## Headline findings

1. **AT Protocol is an identity and claims-interop layer for Dyad, not a substrate.** Adopt `did:web` and W3C Verifiable Credentials; do not run a PDS. The design assumptions of AT Protocol (public-by-default, firehose-broadcast, global namespaces, append-only records) cut across Dyad's grain. But its identity primitives decouple cleanly, and that subset is cheap and reversible.
2. **The fediverse moderation infrastructure collapsed in 2025.** IFTAS effectively wound down; Jigsaw's Perspective API is sunset December 2026. There is no EU-hosted, open-source, production-grade content moderation service. This is a gap, not just an opportunity — several adjacent platforms are about to have a problem.
3. **The codebase is in notably good shape for interop.** The domain model is pure TypeScript with no DB leakage; the service-layer pattern has most of the boundary in place. Two small abstractions (IdentityService and StorageService) would preserve optionality at near-zero cost and pay for themselves even without any interop work.
4. **Most named Rebuild 1 prototypes are not publicly discoverable.** Homebase.id is real and documented; Orbit, Tide Shift, Commons, Simple Meet, Tool Pool, Local Sports Finder have no public repos or project pages as of April 2026. If Dyad builds in the open, it is a first mover rather than a follower.
5. **Three genuinely missing pieces of shared infrastructure are all within reach.** A reputation VC vocabulary (weeks of work, high leverage), a social proof-of-presence protocol (a few months, highest leverage), and an EU-hosted open moderation API (too large alone, but Dyad can be an early user and co-funder). Each maps to specific 2026 venues.
6. **The 2026 calendar aligns unusually well.** NGI Fediversity open call (April 1), DWeb Camp Germany (July 30–Aug 3, an hour SW of Berlin), FediForum, W3C Social Web WG deliverables Q3, Rebuild 3 in Paris (Dec 13–15). These are the venues to stage contributions at.

## Part I — AT Protocol: where it fits, where it doesn't

### Lexicon can describe Dyad's types, but cannot enforce Dyad's invariants

A `berlin.dyad.prompt` Lexicon (using Smoke Signal's `community.lexicon.location.geo` for public general area) is straightforward to sketch. What Lexicon *cannot* express:

- **One-comment-per-user-per-prompt** — AT has no unique-constraint facility. Enforced only in an AppView.
- **State-machine guards** (`canPublish`, `canInvite`) — records are append-only; guards are AppView logic.
- **Cross-repo atomicity** — accepting an invitation writes to two users' repos. No transactional primitive.
- **Private fields** (`exact_location`, pending feedback in the reveal window). AT Protocol's private/encrypted-records story has been an [open discussion since 2023](https://github.com/bluesky-social/atproto/discussions/121). The [January 2026 IETF working group charter](https://en.wikipedia.org/wiki/AT_Protocol) explicitly lists private/limited visibility as future work. Treat as not shipped.
- **Regional scoping.** Every record is a signed, globally-replicable CAR block. Regional privacy is an AppView filtering choice, not a protocol guarantee.
- **Time-bounded publication** (archived slots dropping off the feed). Records have no TTL.

The right way to read this: AT records can become a *public-safe projection* of Dyad's state — never the source of truth. That projection is potentially useful for optional cross-instance discovery. It is not a substitute for the platform.

### Identity: `did:web` over `did:plc`

`did:plc` resolves via Bluesky's registry at `plc.directory`. It supports key rotation and recovery, but is operated by a single US-based benefit corporation. `did:web` resolves via HTTPS to `https://{domain}/.well-known/did.json`, costs a DNS record and a static endpoint, and has zero dependency on the PLC registry.

Bryan Newbold's April 2026 walkthrough ([did:web atproto account with goat](https://whtwnd.com/bnewbold.net/3mdc7fpbxhk26)) confirms that `did:web` alone is sufficient for **identity-layer interop** — a user gets a portable identifier they can later attach to a PDS of their own choosing. The caveat from the [DID spec](https://atproto.com/specs/did) is that without a valid PDS in the DID document, the account is not usable by other AT apps as a full account. That is exactly the right minimum footprint for Dyad: portable identifier, no PDS commitment, no Bluesky dependency, direct alignment with Homebase.id's domain-rooted identity model.

### Reputation: W3C Verifiable Credentials, not AT labels

AT labels are designed for moderation filtering — string values like `spam`, `nsfw`, `verified-scientist`. Encoding "≥5 completed meetings, 0 no-shows in 6 months" as a label means either bucketing (coarse) or overloading the `val` field with a serialized claim (unidiomatic). W3C [Verifiable Credentials v2.0 became a Recommendation in May 2025](https://www.w3.org/press-releases/2025/verifiable-credentials-2-0/) and is purpose-built for structured, signed, verifiable claims with selective disclosure. The tooling ecosystem ([Credo-TS](https://credo.js.org/), [Veramo](https://veramo.io/), [DIDKit](https://spruceid.dev/)) is production-grade for TypeScript.

The clean split: **VCs for structured reputation**, AT labels for binary community-norm flags. They are complementary.

### Non-microblog production references (April 2026)

The single most relevant app for Dyad to study is **Smoke Signal** ([smokesignal.events](https://smokesignal.events), [lexicon repo](https://github.com/SmokeSignal-Events/lexicon)) — events and RSVPs, explicitly migrating types to `community.lexicon.*` so other apps can interop. Nick Gerakines' [candid post-mortem](https://atprotocommunity.leaflet.pub/3mcq4wmjyrc2w) on self-hosting regional event instances is the closest production signal to Dyad's shape. Other non-microblog apps in production: [Tangled](https://tangled.org) (git), [Leaflet](https://about.leaflet.pub) (docs), [Frontpage](https://frontpage.fyi) (link aggregator), Grain (photos), Streamplace (video).

Infrastructure pattern in the wild: almost everyone runs their own AppView (required — it's what knows your domain); self-hosted PDSes are uncommon, self-hosted relays rarer still. Macwright's honest [I haven't made anything with AT Proto yet](https://macwright.com/2026/03/16/atproto) captures why building is harder than it looks.

### Verdict

| Component | Adopt now | Defer | Reject |
|---|---|---|---|
| `did:web` user identifiers | ✓ | | |
| W3C VCs for reputation claims | ✓ | | |
| Align internal types with `community.lexicon.*` shape | ✓ (free) | | |
| Publish Prompts as AT records | | ✓ (until 2nd instance) | |
| Ozone labeller for Dyad | | | ✗ (wrong primitive) |
| Run a Dyad PDS | | | ✗ (locks in Bluesky-relay/PLC graph; revisit after IETF standardization + EU relay + private records) |

## Part II — The ecosystem beyond AT Protocol

### ActivityPub's ceiling for event-shaped apps

Mobilizon (Framasoft, [ActivityPub docs](https://docs.mobilizon.org/5.%20Interoperability/1.activity_pub/)) is the canonical fediverse events platform. It only implements S2S, federates best between Mobilizon instances, and its [FAQ](https://joinmobilizon.org/en/faq/) explicitly declines to support "request to join a group" across federation because "coding that button raises a multitude of complex use cases." Framasoft has moved it to maintenance. Gancio, BookWyrm (with its own extended Activity types), and PeerTube all show the same pattern — app-specific objects need app-specific extensions, federation works partially outside the home app.

The structural issue for Dyad is audience scope. ActivityPub's `to`/`cc` fields have no *normative* privacy semantics; "Followers-Only" and "Local-Only" are implementation conventions. For a platform where the canonical object is a scheduled meeting with an implicit audience of exactly two people (after invitation acceptance), you inherit all the uncertainty without getting a model that represents your data. The 2025 [SocialHub thread on events interoperability](https://socialhub.activitypub.rocks/t/events-interoperability-validation-minimum-requirements-common-extensions/3849) shows this is still being negotiated.

W3C has re-opened the [Social Web Working Group](https://www.w3.org/2026/01/social-web-wg-charter.html) (chartered January 13, 2026, chaired by Darius Kazemi), targeting a backwards-compatible ActivityPub iteration and the [LOLA data portability spec](https://swicg.github.io/activitypub-data-portability/lola) in Q3 2026. That is the right venue to watch; it is not a place to commit to federation work today.

### Identity standards in practice (April 2026)

- **W3C DID Core 1.0** is a Recommendation; `did:web` and `did:key` are production-safe.
- **W3C Verifiable Credentials Data Model 2.0** is Recommendation since May 2025.
- **eIDAS 2.0 / EU Digital Identity Wallet.** Every Member State must offer a wallet to citizens by late 2026. [ARF 2.4.0](https://eu-digital-identity-wallet.github.io/eudi-doc-architecture-and-reference-framework/2.4.0/architecture-and-reference-framework-main/) is the current spec. Four Large-Scale Pilots (POTENTIAL, NOBID, DC4EU, EWC) ran 2023–2025; in 2026 they are transitioning to Member State rollout. Germany's BundID and Italy's IT-Wallet are furthest along; most others are piloting. For production relying-party use, target **OID4VCI** and **OID4VP** — [OpenID self-certification for these opens February 2026](https://openid.net/openid-for-verifiable-credential-self-certification-to-launch-feb-2026/). A real EUDI Wallet integration is 12–18 months from meaningful coverage.
- **Credo-TS** (formerly Aries Framework JavaScript, supports SD-JWT) is the practical TS choice for a SvelteKit app and aligns with the EUDI Wallet stack.

### The moderation infrastructure collapse

This is the most important external development since the last review.

- **IFTAS** announced a funding crisis in [February 2025](https://about.iftas.org/2025/02/06/funding-challenges-and-the-future-of-our-work/). It was not averted. FediCheck went read-only; the Content Classification Service (CSAM/NCII detection) shut down [March 19, 2025](https://about.iftas.org/2025/03/03/iftas-service-shutdowns/). The promised open-source community edition of FediCheck had not materialized publicly as of April 2026.
- **Jigsaw's Perspective API** will be [fully sunset December 31, 2026](https://www.lassomoderation.com/blog/what-is-perspective-api/), with no direct migration path.
- **Commercial alternatives** (Lasso, ActiveFence, Hive, Checkstep) are closed-source, not EU-sovereign, and not aimed at small platforms.
- **OpenAI's moderation endpoint** is free but routes user content to a US vendor.

There is no EU-hosted, open-source, production-grade moderation API as of April 2026. Bonfire, Mobilizon, Gancio, BookWyrm and every small EU platform — including Dyad once cover-image moderation becomes load-bearing — are all affected.

The [Social Web Foundation](https://socialwebfoundation.org/) has partially taken up the moderation working-group coordination role (see their [privacy-preserving interop report](https://socialwebfoundation.org/2025/07/09/report-privacy-preserving-interoperability-and-the-fediverse/)), but it is convening, not running services.

### Rebuild 1 prototypes — what is actually public

**Homebase.id** is the only one with meaningful public presence. Non-profit, open-source, self-sovereign identity built around *domain names as identity* (not strictly W3C DIDs despite similar language), zero-knowledge encryption, YouAuth protocol, ECC-384 keys. [homebase.id](https://homebase.id/). Rebuild directory lists it but doesn't link their governance.

Orbit, Tide Shift, Commons, Simple Meet, Tool Pool, Local Sports Finder — no public repos or project pages under these names as of April 2026. They may exist as working code inside the Rebuild cohort but are not discoverable externally. This is not a criticism; it is a fact about positioning. **If Dyad publishes its work in the open, it is the first or second Rebuild-affiliated platform visibly building shared infrastructure.**

The Rebuild directory of [300+ European social platforms](https://www.rebuild.net/directory/) is the most concretely useful external Rebuild artefact today.

### Venues that matter in 2026

Ranked by likely usefulness to Dyad:

- **DWeb Camp 2026** (Alte Hölle, Germany, July 30–Aug 3). Hour SW of Berlin. Theme: "Root Systems." Lowest-friction venue for a proof-of-presence protocol sketch. [dwebcamp.org](https://dwebcamp.org/).
- **NGI Fediversity open calls** — next deadline April 1, 2026. €5k–€50k grants, EU-only, NixOS-hosted fediverse infra focus. [nlnet.nl/fediversity](https://nlnet.nl/fediversity/). NGI0 Entrust (privacy/trust) and NGI Zero Commons Fund are adjacent larger pools.
- **FediForum** — biannual unconference, virtual, lowest-friction place to demo. [fediforum.org](https://fediforum.org/) and [Project Map](https://fediforum.org/projects/).
- **W3C Social Web WG + SocialCG.** [WG charter](https://www.w3.org/2026/01/social-web-wg-charter.html), [w3c/activitypub](https://github.com/w3c/activitypub).
- **Rebuild 3**, Paris, December 13–15, 2026 — the natural point to publish and hand off open-sourced work.
- **ATmosphere Conference** — cross-pollination; not the main venue.

## Part III — Codebase interop seams

The full seam-level audit is in a separate report; the condensed recommendations:

### Adopt now (preserves optionality at near-zero cost)

1. **`IdentityService` abstraction** — 4–6 hours. `locals.user` (Supabase `User`) is read in ~40 route handlers and passed through services. Wrap in an `IdentityService` returning an opaque `UserIdentity { id, email?, metadata? }`. Zero behaviour change; enables a later DID swap, OIDC migration, or eIDAS wallet integration as a one-line change to a service factory. This also happens to be the cleanest place to hang an `auth.uid()` wrapper function (the sovereignty review's top-priority migration pattern) when the DB side eventually moves.

2. **`StorageService` abstraction** — 10–14 hours. Storage is currently the most federation-hostile seam: hardcoded `iwdjpuyuznzukhowxjhk.supabase.co` URLs in 15+ places, direct `supabase.storage` calls in the upload endpoint. A `StorageService { upload, getPublicUrl, delete }` isolates the provider. Unblocks: regional instances with local storage, provider swap (S3-compatible EU), and avoids the find-and-replace pain that this review's own `sovereignty-lessons-learned.md` warns about.

Both of these pay for themselves on their own merits (testability, swap-ability, operational portability). Interop-readiness is the bonus.

### Defer (wait for concrete use case)

- Email templates extraction (the provider-switch abstraction already exists at `src/lib/server/email.ts`).
- Verifiable Credential issuer module — implement with Credo-TS once the reputation export is a product feature.
- Distributed rate limiter — currently in-memory; upgrade when multi-instance is planned.
- Externalizing hardcoded `dyad.berlin` domain references in email templates, calendar UIDs, user-agent string — trivial when needed, premature now.

### Already clean

Domain model (`src/lib/domain/`), Meeting/TimeSlot/Invitation/Feedback types (no DB leakage), Location service (Nominatim-backed, extensible `regionBounds` map), service-layer pattern itself. These are portable today.

## Part IV — Where Dyad can strategically contribute

The interop-and-open-infrastructure doc names the Dyad patterns that are novel enough to share (feedback gate, structural moderation, reputation without scores, physical-presence verification). This review identifies the three *infrastructure* gaps where Dyad's work would have the most leverage for the broader ecosystem, ranked by feasibility × leverage.

### 1. A reputation-as-Verifiable-Credentials vocabulary for small social platforms — **start now**

**Gap:** The plumbing is mature (Credo-TS, Veramo, VC Data Model 2.0). What is missing is a credible *vocabulary* — the JSON-LD `@context` and claim schemas — for platform-issued reputation in social platforms: attendance, reliability, community-specific qualities, testimonial signals. Nobody has shipped this.

**Why Dyad:** You are going to issue these credentials for your own users anyway. The internal research already contemplates it. The only additional work is publishing the schema under an open licence with a reference issuer.

**Who benefits:** Homebase.id (which needs claim vocabularies for identity to carry meaning), Bonfire communities, language-exchange and peer-learning platforms, any Rebuild directory platform that issues reputation.

**Effort:** ~2–4 weeks of concentrated work including governance setup (GitHub repo, open licence, initial `@context` under a stable domain, reference issuer integrated with Dyad's feedback flow).

**Venues:** Publishable at FediForum as a short demo; submit as a contributed schema to W3C Credentials CG; hand off at Rebuild 3 as shared infrastructure.

### 2. A city-scoped social proof-of-presence protocol — **prototype for DWeb Camp**

**Gap:** Every local-first platform has this problem (Dyad, Orbit if it exists, hyperlocal sharing, city events, community forums). Academic PoL research is mature ([Nature 2025 survey](https://www.nature.com/articles/s41598-025-04566-4), [arXiv 2508.14230](https://arxiv.org/html/2508.14230)) but not productized for consumer use. FOAM and similar are infrastructure-heavy and crypto-native. There is no open, consumer-grade protocol for "verify physical presence in a city" that respects privacy, includes people with unstable residency, and is VPN-neutral.

**Why Dyad:** Your constraints are unusually tight (the existing doc itemizes them). You have to solve this for your own product. Whatever you build will naturally be more careful than anything a larger platform would ship.

**Possible shape:** Invitation-chain (web-of-trust: existing verified locals vouch), plus capability-delegated attestations (one-shot, time-bounded, non-reusable) — aligning with what [Spritely](https://spritely.institute/)'s object-capability model advocates. QR codes at physical places is a specific instance. UCAN-style delegation is the cryptographic primitive.

**Effort:** 2–4 months for a protocol spec + reference implementation. Realistic only if paired with the product roll-out (you are validating against real users anyway).

**Venues:** First draft at **DWeb Camp 2026** (July 30–Aug 3, an hour from Berlin — this is the right room). Paper at FediForum autumn. Submitted to NGI0 Entrust or NGI Zero Commons Fund for follow-on funding.

**Risk:** Easy to overbuild. The MVP is probably "vouching chain + per-origin capability tokens," not a protocol with its own specification document. Treat the protocol as an artefact that emerges from a working implementation.

### 3. An EU-hosted, open-source moderation API — **be an early user and co-funder, not the builder**

**Gap:** IFTAS is gone; Perspective sunsets Dec 2026; commercial options are closed, US, and not small-platform-shaped. Every EU social platform is about to need a replacement.

**Why not Dyad alone:** This is too large to build as a side project. CSAM/NCII detection requires legal infrastructure (reporting to NCMEC-equivalent authorities), model hosting, abuse desks. Dyad's structural moderation means you have a long runway before needing this for your own product.

**Dyad's contribution:**
- Be an opinionated early user of whoever does build this (specify your cover-image moderation slice concretely).
- Co-sign (with Bonfire, Mobilizon community, Gancio) a funding proposal to NGI0 Entrust for 2026 round.
- Publish Dyad's specific requirements as a public spec-fragment ("what a small values-aligned EU social platform needs from a moderation API") to give whoever takes this on a clear target.

**Venue:** W3C Social Web WG and Social Web Foundation moderation working group.

### Supporting contributions (lower-leverage but real)

- A **SvelteKit adapter for the subset of ActivityPub that's useful for non-microblog apps** (`did:web` identity, block-list subscription, data export) extractable from Dyad's eventual implementation.
- A **federated blocklist standard for non-ActivityPub platforms** — the Social Web Foundation's interop report [gestures at this](https://socialwebfoundation.org/2025/07/09/report-privacy-preserving-interoperability-and-the-fediverse/); nobody has shipped it.
- The **location service** (`src/lib/services/location.ts`) is already Rebuild-extractable per the March 25 review. Publishing this as a small NPM package with a documented API is a few hours of work and a concrete signal of "build in the open."

## Part V — Recommended sequence

Phased against the 2026 calendar:

**Q2 2026 (now–June):**
- Land `IdentityService` and `StorageService` abstractions. Pure codebase hygiene; unlocks everything else.
- Extract `location.ts` as a small standalone NPM package (Rebuild-extractable, already clean).
- Publish an initial `@context` + claim schemas for feedback/reputation VCs as a GitHub repo under an open licence. Stub reference issuer.
- Submit a small NGI Fediversity grant (next deadline April 1 — if missed, next cycle). Scope: "interop toolkit for small EU social platforms" covering the VC schemas + location service extraction.

**Q3 2026 (July–September):**
- DWeb Camp (July 30–Aug 3): present social proof-of-presence sketch; gather collaborators.
- FediForum autumn: demo reputation VCs issued from Dyad to an external verifier.
- Track W3C Social Web WG outputs; adopt LOLA data portability when it stabilizes.
- Co-sign a moderation-API funding proposal with at least one other small platform (Bonfire is the natural partner).

**Q4 2026 (October–December):**
- Rebuild 3 Paris (Dec 13–15): publish the interop toolkit as open-sourced Rebuild materials. Hand off governance (the Rebuild framework itself will open-source at the same event).
- If the proof-of-presence prototype has proven out with Dyad users, publish the protocol spec.

## Part VI — Open questions that still need answering

Several of these are from the existing `interoperability-and-open-infrastructure.md`; this review closes some and re-opens others with sharper edges.

- **Does Dyad run a PDS?** This review recommends *no* until IETF standardization completes, an EU-operated relay exists, and private records ship. Revisit year-end 2026. *(Previously open; now answered provisionally.)*
- **What DID method?** `did:web`. *(Previously open; now answered.)*
- **Federation between regional instances vs regional scoping in one platform?** Still open. This review leans toward *regional scoping within one platform* until there's a second instance to validate federation against.
- **Which export format for GDPR portability?** The existing docs say "JSON/ZIP minimum." Recommend aligning the JSON shape with LOLA when LOLA stabilizes, and with the reputation VC schemas (Part IV.1) where they overlap.
- **Should Dyad be open source?** Still open as a whole; this review recommends *selective* open-sourcing — the interop toolkit, location service, VC schemas, proof-of-presence protocol — with the core application code remaining a platform decision (the design constraints, not the code, are the shareable insight).
- **Who owns the reputation VC schema after Dyad publishes it?** New question. Options: a Dyad-governed repo, a Rebuild-collective repo (aligns with Rebuild's Dec 2026 open-sourcing), W3C Credentials CG. Default to Rebuild-collective if governance exists by mid-2026; Dyad-governed with open contribution process if not.

## Sources

See sibling agent research reports (attached in the conversation that produced this document) for the full source trail — AT Protocol evaluation with ~40 URLs, ecosystem survey with ~35 URLs, codebase seam audit with file-and-line-level references. Key starting points:

- [AT Protocol SDKs](https://atproto.com/sdks) / [Lexicon spec](https://atproto.com/specs/lexicon) / [DID spec](https://atproto.com/specs/did)
- [Smoke Signal lexicon](https://github.com/SmokeSignal-Events/lexicon) — closest production analog
- [W3C VC Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/) / [Credo-TS](https://credo.js.org/)
- [EUDI ARF 2.4.0](https://eu-digital-identity-wallet.github.io/eudi-doc-architecture-and-reference-framework/2.4.0/architecture-and-reference-framework-main/)
- [W3C Social Web WG charter](https://www.w3.org/2026/01/social-web-wg-charter.html) / [SWF privacy-preserving interop report](https://socialwebfoundation.org/2025/07/09/report-privacy-preserving-interoperability-and-the-fediverse/)
- [DWeb Camp 2026](https://dwebcamp.org/) / [NGI Fediversity](https://nlnet.nl/fediversity/)
- [IFTAS service shutdowns (March 2025)](https://about.iftas.org/2025/03/03/iftas-service-shutdowns/) / [Perspective API sunset](https://www.lassomoderation.com/blog/what-is-perspective-api/)
- [Rebuild directory](https://www.rebuild.net/directory/) / [Homebase.id](https://homebase.id/)
