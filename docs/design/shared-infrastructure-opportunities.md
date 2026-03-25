# Shared Infrastructure Opportunities

What Dyad can build as open, shared infrastructure that serves both our platform and the wider European social platform ecosystem — without open-sourcing the entire application.

## The frame

The Rebuild letter commits to building platforms through "startups, NGOs, cooperatives, open-source communities" — it does not require every platform to be fully open source. The Shift frames social platforms as "civic sovereign infrastructure" and explicitly calls for European autonomy. The design principles call for transparency about how platforms work.

The question is: what layers of the stack can be extracted, open-sourced, and collectively maintained in a way that strengthens everyone's platforms without undermining anyone's business case? And how do we make these choices in a way that keeps sovereignty (at minimum EU-hosted, ideally distributed and decentralised) as a first-order constraint?

The prototypes from Rebuild 1 show that many platforms are solving overlapping problems independently. Homebase.id is building self-sovereign identity with DIDs and Verifiable Credentials. Orbit is handling proximity and location. Tide Shift is tackling collective migration. Commons is generating community structures. Each of these touches infrastructure that could be shared.

## Principles for shared infrastructure decisions

1. **Open the layers, keep the experience.** The value of Dyad is not in its authentication system or its calendar integration — it's in the combination of design constraints that produce a particular kind of human encounter. The infrastructure layers underneath can be open without giving away what makes Dyad Dyad.

2. **EU-sovereign by default.** Every dependency we take should be hostable on European infrastructure (Hetzner, OVH, Scaleway, etc.). Prefer self-hostable open source over managed services, European providers over US ones, decentralised over centralised. This is a constraint, not an aspiration — it shapes which technologies we choose.

3. **Decentralised where it matters.** Not everything needs to be decentralised. Auth and identity benefit from decentralisation (no single point of failure, no single point of control). Media storage benefits from distribution (CDN, cost sharing). But some things are fine centralised per instance — the discover page, the feedback system, the moderation queue. Be honest about where decentralisation serves users and where it's ideological overhead.

4. **Contribute what we build, use what others build.** If we solve a problem that other platforms also have, extract it. If someone else has already solved it well, use their solution rather than rebuilding.

## Infrastructure layers and opportunities

### Identity and authentication

**The problem everyone has:** Every European social platform builds its own registration, login, and user management. Users create separate accounts on every platform. There is no shared identity layer.

**What we could build/adopt:**
- An OpenID Connect provider that can be self-hosted on European infrastructure, with support for pseudonymous accounts (not everyone wants to use their real name). This serves Dyad's need for privacy-respecting auth while being useful to any platform.
- DID (Decentralized Identifier) support at the identity layer, so that a user's identity can persist across platforms and instances. did:web is the most pragmatic starting point (maps to domains, no blockchain dependency, works with existing web infrastructure). This connects to Homebase.id's work with W3C web:DID and Verifiable Credentials.
- Admin-approval registration as a module. Dyad's invite-and-approve flow is not unique to us — community platforms, co-ops, and trust-based platforms all need this.

**Sovereignty constraint:** The identity provider must be self-hostable. No dependency on Auth0, Firebase Auth, or Cognito. The reference implementations exist (Keycloak, Authentik, the Matrix Authentication Service pattern). The work is in making them easy to deploy on European infrastructure with good defaults for social platforms.

**Decentralisation opportunity:** If multiple platforms adopt DIDs, users carry their identity across platforms without any single platform controlling it. This is real sovereignty at the user level.

### Reputation and trust

**The problem everyone has:** How do you build trust between strangers on a platform? Most platforms use numerical ratings (Uber, Airbnb) or follower counts (Twitter, Instagram). Both have well-documented failure modes.

**What Dyad does differently:** Reputation through testimonials, behavioural signals, and curated adjective vocabularies. Profile-visible, not score-based. The user controls what to display. The feedback gate ensures that feedback is reflective and simultaneous.

**What we could share:**
- A reputation data model and API that other platforms can adopt or adapt. Not the feedback gate itself (that's Dyad's design), but the underlying model: testimonial-based reputation with user-controlled visibility, behavioural signals (reliability, cancellation history), and curated descriptive vocabularies.
- If combined with Verifiable Credentials, a user's reputation from Dyad could be presented to another platform as a credential: "this person has N completed meetings with positive feedback on Dyad Berlin." The other platform decides how much weight to give it. This is portable trust without portable scores.

**Sovereignty constraint:** Reputation data stays on the platform's infrastructure. The VC model means the user carries a signed attestation — the verifying platform doesn't need to call back to Dyad's servers.

### Location services

**The problem everyone has:** Any platform dealing with physical place (meetups, local communities, events, lending networks) needs location autocomplete, region scoping, general-area generation (the "Airbnb-style" approximate location), and map rendering.

**What Dyad needs:** Location API with autocomplete scoped to a region, exact-to-general-area conversion, and map views. This is in the design docs already.

**What we could build:**
- A self-hostable location service backed by open data (OpenStreetMap/Nominatim) rather than Google Maps or Mapbox. European-hosted, privacy-respecting (no query logging to US companies), with the exact-to-general-area conversion built in.
- This directly serves Orbit (proximity discovery), Local Sports Finder (nearby activities), Tool Pool (hyperlocal lending), and any other platform dealing with physical space.

**Sovereignty constraint:** Google Maps and Mapbox are US services that log queries. A Nominatim instance on European infrastructure eliminates this dependency. Protomaps or MapLibre for rendering.

### Regional verification

**The problem:** Dyad needs to know users are in Berlin (or the relevant region) without requiring location tracking, IP checks, or official residence documentation — all of which are either unreliable, exclusionary, or privacy-violating.

**The constraints are unusually tight:**
- Many people in cities like Berlin have complicated or unstable residential situations (sublets, temporary registrations, no Anmeldung, asylum seekers, digital nomads). Official residence verification would exclude exactly the people who most need community connection.
- Location data sharing (GPS, IP geolocation) conflicts with privacy principles and is easily spoofed.
- VPN usage should not prevent someone from using the platform.
- The verification should confirm presence in a place, not residence at an address.

**What Dyad is exploring:** Creative physical-world verification (e.g. QR codes at locations in the city — a lightweight "proof of presence" that doesn't require disclosing where you live). This is an unsolved problem.

**Shared infrastructure opportunity:** This is a genuinely novel problem worth solving at the infrastructure level. Any platform that cares about locality (and many European platforms are local-first by design) has this problem. A privacy-respecting regional presence verification service — one that confirms "this person is/was physically in Berlin" without collecting where they live, what their residential status is, or tracking their movements — is infrastructure that doesn't exist yet. If Dyad solves it, it should be open. Potential approaches:
- Physical QR code scans at public locations (libraries, transit stations, community spaces)
- Short-lived, rotating verification challenges tied to physical places
- Attestation from existing verified community members (web-of-trust)
- Integration with eIDAS 2.0 location attestations if/when available
- Some combination that provides lightweight assurance without becoming a surveillance tool

### Meeting coordination and calendar

**The problem:** Scheduling a meeting between two people with calendar integration. Not a new problem, but doing it in a privacy-respecting way on European infrastructure is less common.

**What Dyad needs:** Time slot management, .ics generation, calendar deep links, conflict detection.

**What we could share:**
- A lightweight scheduling service that handles time slot management and calendar export without depending on Google Calendar or Outlook APIs. Self-hostable, stateless where possible.
- This serves Simple Meet (the "doodle that actually works" from the prototypes), and any platform that coordinates physical meetups.

### Content moderation primitives

**The problem everyone has:** Image moderation (CSAM detection, spam, inappropriate content), text moderation, user reporting workflows. Cover image moderation is an open question in Dyad's design docs.

**What we could use:**
- IFTAS's shared moderation intelligence (FediCheck, CARIAD) for cross-instance signals.
- Open source image classification models running on European infrastructure, rather than depending on US cloud AI services (Google Cloud Vision, AWS Rekognition). This connects directly to the AI sovereignty question.
- A moderation queue and workflow module that social platforms can adapt. Admin tools for reviewing reports, suspending users, managing content — every platform builds this, and it's not differentiating.

**Sovereignty constraint:** Content moderation that depends on US cloud AI services means your moderation decisions are routed through US infrastructure. Self-hosted models (running on Hetzner GPUs or similar) are the sovereign alternative.

### Notification service

**The problem:** Every platform needs to send emails and optionally push notifications. Dyad's "healthy brain" approach means minimal, opt-in notifications.

**What we could share:**
- A self-hosted notification service with good defaults for respectful platforms: opt-in by default, batching, rate limiting, no dark patterns. Built on European email infrastructure (not SendGrid/Mailgun which are US-hosted).
- The "healthy brain" notification philosophy as a documented pattern that other platforms can adopt.

### Data export and portability

**The problem:** EU regulations (GDPR, Data Act) require data portability. Every platform needs an export mechanism.

**What we could build:**
- A standard data export format for social platform data. Not platform-specific but covering the common objects: profile, authored content, relationships, reputation/feedback, activity history.
- Export tooling as a library that platforms can integrate.

## What stays proprietary (and why that's fine)

The design constraints that make Dyad Dyad are not infrastructure:
- The feedback gate mechanic
- The single-shot comment model
- The no-pre-meeting-contact rule
- The specific UX flows and interaction design
- The discover page and matching logic
- The prompt lifecycle

These are product decisions, not infrastructure. They can be described publicly (as the design docs already do) without being extracted as reusable components. Other platforms may be inspired by them, and that's a feature of operating within a community like Rebuild, not a risk.

## Architectural decisions to make now

These choices compound over time. Getting them right early avoids painful migrations later.

1. **Auth: choose an OpenID Connect-compatible provider from day one.** Don't build custom auth. Use something self-hostable (Authentik, Keycloak, or similar) that can later be extended with DID support. This keeps the door open for portable identity without committing to it now.

2. **Location: use OpenStreetMap/Nominatim from day one.** Don't start with Google Maps and plan to migrate later. The migration is painful and the dependency deepens with every feature built on top of it.

3. **Hosting: Hetzner or equivalent EU provider.** Set the precedent. Use infrastructure-as-code (the same Ansible/Terraform patterns used for the Matrix server setup) so the entire deployment is reproducible on any EU provider.

4. **Media storage: S3-compatible object storage on EU infrastructure.** Hetzner Object Storage, OVH Object Storage, Scaleway. Not AWS S3. The S3 API is a de facto standard — the important thing is where the data physically lives.

5. **Email: EU-hosted transactional email.** Mailjet (French, Sinch-owned but EU-hosted) or self-hosted (Postal, Mailtrain). Not SendGrid, not Mailgun, not SES.

6. **AI/ML: self-hostable models for any AI features.** If Dyad uses AI for content moderation, recommendation, or any other purpose, the models should be runnable on European infrastructure. Mistral (French) for LLM capabilities, open source image classifiers for content moderation.

7. **Extract early, not late.** When building a component that is clearly not Dyad-specific (location service, calendar integration, notification service, data export), build it as a separate module from the start with a clean API boundary. It's much harder to extract later.

## Contribution to the working group

This analysis maps directly to the interop working group's mandate. The shared infrastructure opportunities identified here are not theoretical — they're things Dyad needs to build anyway. The question is whether to build them as internal components or as shared infrastructure that the Rebuild community maintains together.

The working group's first mapping exercise (what is being built, by whom, what overlaps exist) would surface which of these opportunities have the most energy behind them. Dyad's contribution to that exercise is this document and a willingness to build in the open where the infrastructure layer allows it.

## Extraction principles (added 2026-03-25)

**Don't extract prematurely.** A technically portable module is not the same as a useful open-source project. Extraction has maintenance cost. Only extract when other builders would actually use and contribute to it.

**Criteria for extraction:**
- Would other Rebuild builders use this? Would they contribute?
- Is it novel enough to justify separate maintenance?
- Is the pattern proven in production, not just architecturally clean?

**Patterns to watch as they mature:**

| Pattern | Novelty | Extract when |
|---|---|---|
| Privacy-preserving location (exact → general area → conditional reveal) | High | Proves useful across 2+ contexts |
| Regional verification / presence proof | Very high | Approach validated with real users |
| Feedback gate / accountability middleware | Medium | Generalises beyond dyad's specific rules |
| Reputation without scores (adjective vocabulary + signals) | Medium | Model proves effective in practice |

**What stays proprietary** (and why that's fine per Rebuild principles):
- Feedback gate UX, single-shot comment model, invitation mechanics, discover matching
- These are product decisions, not infrastructure. Other platforms can be inspired without requiring interop.

**Current state** (2026-03-25): See `docs/design/shared-infrastructure-review-2026-03-25.md` for the full sovereignty scorecard and coupling analysis.
