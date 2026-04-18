---
title: Open Infra Working Group (Rebuild-adjacent) — 2026 Roadmap
date: 2026-04-17
last_updated: 2026-04-18
status: draft
owner: Theodore Evans (convenor, handing off by design)
related:
  - docs/research/2026-04-17-interop-deep-review.md
  - docs/research/interoperability-and-open-infrastructure.md
  - docs/design/shared-infrastructure-opportunities.md
  - docs/design/shared-infrastructure-review-2026-03-25.md
  - docs/plans/2026-04-18-001-refactor-shared-infra-foundations-plan.md
---

# Open Infra Working Group (Rebuild-adjacent) — 2026 Roadmap

High-level plan from April 2026 through the close of Rebuild (December 15, 2026). Scaffold for deeper planning in the next implementation session, not an implementation spec.

## Framing (added 2026-04-17, end of research session)

This is **not** a plan for Dyad to ship open infrastructure alone. It is a plan for a **Rebuild-adjacent working group of small, values-aligned social platform builders** to compare notes, produce a shared map of what is and is not being built, and — where momentum aligns — publish shared infrastructure together.

- **Scope: adjacent, by design.** Rebuild cohort + others who share the values (Bonfire, Homebase.id, SWF-circle contributors, NGI-funded teams, the existing Matrix/mailing-list circle including Robin Berjon and friends). Rebuild is one venue, not the container.
- **Dyad's role is worked example, not subject.** The deep-review pass (`docs/research/2026-04-17-interop-deep-review.md`) is offered as one entry in a map this group could build together. Other members do their own pass in whatever form suits them.
- **Organizing question:** *"For the kind of platform we're each building — small, values-aligned, resisting the typical growth dynamics — what are we building, what are we refusing, what do we need, and what's not being built that should be?"*
- **Output through-line:** a living **collective map** of small values-aligned platforms — what they build, what they refuse, what seams they've identified, what gaps they've hit. Individual extraction artefacts (M3, M5) accrete into that map.
- **Governance principle:** distributed agency by construction. Theodore convenes, puts the first entry out, synthesises once there are three or more entries — then hands the pen off. Rotating ownership by artefact.
- **Calendar as forcing function, not any individual.** Open Social Awards (May 1), PublicSpaces (June 4–6), DWeb Camp (July 30–Aug 3), FediForum (autumn), Rebuild 3 Paris (Dec 13–15). External deadlines carry the cadence.

## How to use this document

- Each milestone has: **goal → deliverables → draft substance → decisions → dependencies → effort**.
- The working group (M0) is the immediate move. Open Social Awards (M1) is the first forcing function behind it.
- "Publish" means: public repo, open licence (CC BY 4.0 for docs / Apache 2.0 or MIT for code), dated README, referenceable URL.
- Effort estimates are deliberately coarse ranges. Narrow them in the next session.
- Treat anything marked **[DECIDE]** as a fork in the road that needs a human call.

## Calendar overview

| When | Milestone | Driving deadline | Effort |
|---|---|---|---|
| week of 2026-04-21 | **M0: Form the working group** | Self-imposed, gates M1 | 1 focused day (outreach + room) |
| by 2026-05-01 | M1: Open Social Awards submission | External (2 weeks) | 2–5 days packaging |
| partially landed 2026-04-18 | M2: Foundation code abstractions | Product readiness | ~1 week engineering (3 of 4 pieces done; IdentityService remaining) |
| by 2026-06-05 | M3: Published open-infra artefacts | Awards ceremony | ~2–3 weeks |
| 2026-06-04–06 | M4: PublicSpaces Conference, Amsterdam | External | travel + 2 days prep |
| 2026-07-30–08-03 | M5: DWeb Camp proof-of-presence workshop | External | ~3–4 weeks prep |
| autumn 2026 | M6: FediForum demo | External (TBD) | ~1–2 weeks prep |
| 2026-12-13–15 | M7: Rebuild 3 Paris handoff | External | ~2–3 weeks consolidation |

---

## M0: Form the working group — **week of 2026-04-21**

### Goal

Stand up a lightweight, Rebuild-adjacent working group of small values-aligned platform builders around the organizing question above, with Dyad's deep-review offered as the first worked entry in a shared map the group will build together.

### Deliverables

1. **One dedicated Matrix room**, public by policy (not E2EE, linkable, archivable). Hosted on prefig.tech for now — migration deferred; one clean room avoids splitting the community. Named to reinforce the frame (candidate: "Open Social Infra WG" or the organizing question itself as the topic).
2. **The Matrix post** (draft in Appendix A) that introduces the frame, shares Dyad's deep-review + plan, and invites each reader to do their own pass in whatever form suits them.
3. **A small set of targeted emails** to close readers (Robin Berjon + 3–4 others) — Dyad-shaped, but asking for their *worked entry*, not reaction to Dyad's. Draft shape in Appendix B.
4. **A shared index** — a single public page (GitHub repo README, static page on dyad.berlin, or Proof doc) that tracks entries in the collective map as they arrive. Low-ceremony; accretes.

### Convening principle

- Theodore puts his entry out first so the shape is concrete.
- Theodore synthesises a first pass of the collective map once there are 3+ entries, then hands the pen off (rotating editor by external deadline, or volunteer).
- No standing meetings. Async-first. External deadlines carry the cadence.

### Decisions

- **[DECIDE]** Room name. "Open Social Infra WG" / the organizing question as the topic / something else. The name does real work — reinforces the frame every time it shows up in someone's sidebar.
- **[DECIDE]** Where the shared index lives. Default: a `rebuild-adjacent-infra` GitHub repo with an editable README. Low friction, version-controlled, linkable from anywhere.
- **[DECIDE]** Who the first 3–5 targeted emails go to beyond Robin Berjon. Pick by "sharpest specific read on one claim," not by seniority.

### Effort

1 focused day: create the room, post, send ~5 targeted emails, stand up the index page stub.

### Gates

M1 narrative is stronger if M0 has coalesced (even loosely) by the time it is submitted. If the working group has 2+ co-signers by end of April, consider a joint submission; otherwise, solo submission with working-group framing (see M1).

---

## M1: Open Social Awards submission — **by 2026-05-01**

### Goal

Submit a compelling application that positions Dyad as **the first worked example of an emerging Rebuild-adjacent working group** of values-aligned platform builders. Dyad is what this looks like in one project; the submission's deeper claim is that the group collectively produces the map and the infrastructure the ecosystem needs.

**Two modes**, decide at ~T-5 days:

- **Mode A (default): solo submission, working-group framing.** Dyad submits; narrative foregrounds Dyad as worked example + explicitly names the emerging working group (with or without named co-signers depending on who has responded by then).
- **Mode B (stretch): joint submission.** If 2+ other platforms have signalled co-sign by ~2026-04-27, submit as the working group with Dyad as lead example. Higher leverage, higher coordination cost. Don't block on this.

### Deliverables

1. Submission form completed via https://conference.publicspaces.net/en/award
2. A **submission narrative** (~1500–2500 words depending on the form's prompts) covering: what Dyad is, what patterns it is extracting, what open infrastructure it will publish, and why this matters for the broader ecosystem.
3. **At least one linkable artefact** in public form by the deadline (see M3 for the full set — for M1, one is enough).
4. A short **supporting-material bundle**: design docs that are already published, research docs (possibly via Proof or a public GitHub mirror), prototype screenshots.

### Draft: submission narrative outline

Working title: **"Dyad: a regional social platform as a workbench for open infrastructure."**

Opening (hook, ~200 words)
- The problem the platform is built to solve: in-person conversations between strangers in a city. Structural design choices that refuse typical platform growth dynamics.
- Why this makes Dyad an unusual substrate for extracting *reusable open infrastructure*: the constraints force us to solve problems nobody has solved in the open.

Section 1 — What Dyad is (~300 words)
- The product in one paragraph.
- The design principles that matter for this jury: structural moderation, reputation without scores, feedback gate, anti-engagement defaults. Cite `docs/design/design-principles.md`.
- Current state: live alpha, served from EU infrastructure.

Section 2 — What we're extracting (~500 words)
The three pieces from the deep-review Part IV, framed as gifts to the ecosystem rather than as Dyad's needs:
- **A reputation-as-Verifiable-Credentials vocabulary for small social platforms.** Concrete claim: "the plumbing is mature, the vocabulary isn't."
- **A social proof-of-presence protocol for local-first platforms.** Concrete claim: every regional platform has this problem; nobody has published a privacy-respecting, non-GPS, non-residency-document-based protocol.
- **A privacy-preserving location service** (exact → general area → conditional reveal). Concrete claim: already extractable, will be published.

Section 3 — Why this jury, why this venue (~200 words)
- Connection to Audrey Tang's pluralism work: structural design over content moderation.
- Connection to Masnick's *Protocols, Not Platforms*: infrastructure over walled gardens.
- Connection to PublicSpaces' public-interest framing: civic infrastructure, not commercial platform.

Section 4 — The sequenced plan (~400 words)
- Where we are today; what ships by June 5 (M3); what ships by DWeb Camp (M5); what hands off at Rebuild 3 Paris (M7).
- Clear separation: what stays proprietary (Dyad's product UX) vs. what becomes open infrastructure (the three extraction targets).

Section 5 — What we'd do with the funding (~200 words)
- €10k Grand Prize: underwrites 2–3 months of dedicated time on the proof-of-presence protocol prototype + publication.
- €5k Excellence: underwrites the VC vocabulary repo + reference issuer.
- Honest: the funding makes the difference between "eventually" and "this year."

Closing (~150 words)
- The larger commitment: Dyad is being built as a demonstration of how small platforms can support each other through shared open infrastructure. Rebuild 3 Paris (Dec 2026) is the handoff point. This submission is the public moment.

### Decisions to make this week

- **[DECIDE]** Submit as an individual (Theodore) or as "Dyad Berlin" organization? Affects tone and jury perception. Default recommendation: organization, Theodore as contact.
- **[DECIDE]** Which artefact to have live by May 1 from the M3 list? Recommended: **location-service NPM package** (lowest effort, already clean per the March 25 review) *or* **the VC vocabulary repo stub** (higher ecosystem signal, more work). Could do both if paired with M2.
- **[DECIDE]** Publish the deep-review research doc (`docs/research/2026-04-17-interop-deep-review.md`) externally, or keep it repo-internal and cite in the narrative? Publishing publicly (via Proof, a Gist, or a static site) strengthens the submission; keeps Dyad visible in the open-infra conversation independently of award outcome.

### Dependencies

- Existing research docs in `docs/research/` and `docs/design/` — already in shape to cite.
- A public-facing landing for the interop work (could be a single static page on dyad.berlin or a GitHub org README).

### Effort

2–5 days of focused work, mostly narrative drafting + packaging. The underlying intellectual work is already done.

---

## M2: Foundation code abstractions — **partially landed 2026-04-18**

### Goal

Land the code abstractions identified in the seam audit (`IdentityService`, `StorageService`, `app.current_user_id()`). These pay for themselves on their own merits (testability, provider swap-ability) and preserve full optionality for DIDs, OIDC, eIDAS wallets, regional storage, and federation later.

### Status (2026-04-18)

Three of the four pieces landed together in PR #120 — smaller surfaces than the March-25 scorecard predicted once measured on the actual codebase. `IdentityService` is the remaining piece and has its own plan at [`docs/plans/2026-04-18-001-refactor-shared-infra-foundations-plan.md`](docs/plans/2026-04-18-001-refactor-shared-infra-foundations-plan.md).

- ✅ **`StorageService`** — `src/lib/services/storage.ts` + unit tests + test-factory wiring. `src/routes/api/upload/+server.ts` refactored to use it, with `handleServiceError` wrapping so bucket / SDK internals don't leak. Scope came in at **1 file to migrate, not the 15+ the scorecard estimated** — intervening work had already cleaned up other call sites.
- ✅ **Hardcoded asset URL extraction** — 17 `iwdjpuyuznzukhowxjhk.supabase.co` references in `src/routes/why/+page.svelte` consolidated into one `ASSETS` constant driven by a new `PUBLIC_ASSET_BASE_URL` env var. Default falls back to the current bucket URL; a sovereign CDN is now a one-env-var swap. `.env.example` + CLAUDE.md updated. Scope came in at **1 file, not the 17 the scorecard estimated** — the rest had already been cleaned up.
- ✅ **`app.current_user_id()` SQL wrapper** — additive migration (`supabase/migrations/20260418120000_add_app_current_user_id.sql`) creates the `app` schema + SECURITY DEFINER wrapper around `auth.uid()`. Applied to remote via the CI migrate workflow (#113 + #115). CLAUDE.md updated so new policies adopt the wrapper; the existing 38 `auth.uid()` references stay put until their surrounding policies are touched for other reasons.
- ✅ **Sovereignty verifications** — Leaflet self-hosting confirmed (CSS served from `/leaflet/leaflet.css`, icons resolved via `L.Icon.Default` imagePath override, all six assets in `static/leaflet/`). Supabase region confirmed **EU Ireland** via dashboard, with the sovereignty-spectrum caveat logged (EU-member hosting, US-parent managed service). Scorecard updated.
- 🟡 **`IdentityService`** — not yet landed. Separate plan; `locals.user.id` → `locals.identity.id` swap across ~10 files / ~50 call sites. Sequenced next so the touch area doesn't conflict with in-flight product work.

### Deliverables (remaining)

1. **`IdentityService`** — new file `src/lib/services/identity.ts`. Wraps Supabase `User` in an opaque `UserIdentity { id, email?, metadata? }`. Introduces `requireIdentity(locals)` alongside the existing `requireAuth`. Replaces ~50 call sites of `locals.user.id` with `requireIdentity(locals).id`. Detailed plan at [`docs/plans/2026-04-18-001-refactor-shared-infra-foundations-plan.md`](docs/plans/2026-04-18-001-refactor-shared-infra-foundations-plan.md).

### Decisions (resolved)

- ~~**[DECIDE]** Do M2 before or after M1?~~ Resolved: before. Three pieces shipped on 2026-04-18, unblocked by the operational rhythm we had running rather than waiting on M1.
- ~~**[DECIDE]** Do the refactors in one PR each or combine?~~ Resolved: Sovereignty verifications + StorageService + asset-URL extraction + SQL wrapper landed as one PR (#120) because they're all no-op / additive and share the same reviewer context. IdentityService gets its own PR given the ~50-site mechanical swap.

### Dependencies

- `IdentityService` plan notes: "sequence after the current editor-lazy-create PR lands so the touch area settles". That PR (#119) has now merged, so IdentityService is unblocked whenever the next focused session picks it up.

### Effort

- ✅ `StorageService`: S (landed)
- ✅ Hardcoded URL extraction: S (landed)
- ✅ `app.current_user_id()` wrapper: S (landed)
- ✅ Sovereignty verifications: trivial (landed)
- 🟡 `IdentityService`: S–M (~4–6 hours)

---

## M3: Published open-infrastructure artefacts — **by 2026-06-05**

### Goal

By the Open Social Awards ceremony, have at least two of the three extraction targets live in the world — dated, open-licensed, with README and at least one external citation.

### Deliverables

#### 3a. **`@dyad/location`** — extracted location service as an NPM package

- Source: `src/lib/services/location.ts` (162 LOC, already clean per March 25 review).
- Changes: inline `LocationRef` type, inject rate limiter as dependency, make region bounds + user-agent configurable.
- Licence: MIT.
- Repo: `dyad-berlin/location` (or `rebuild-infra/location` if a Rebuild GitHub org exists by then — see M7 decision).
- README covers: problem statement (what sovereign location-autocomplete-plus-general-area-derivation looks like), API, supported regions, Nominatim hosting guidance.

#### 3b. **`dyad-berlin/reputation-vc`** — reputation-as-VC vocabulary

- A JSON-LD `@context` + a small set of W3C VC-conformant claim schemas for: "completed meeting", "positive feedback aggregate", "reliability signal" (no-shows over a time window), "reputation testimonial" (free-form, signed).
- Stub reference issuer in TypeScript using Credo-TS (just enough to prove the shape; not wired into Dyad production until M6 or later).
- Licence: CC BY 4.0 for the vocabulary, Apache 2.0 for the reference issuer code.
- README covers: the gap (plumbing is mature, vocabulary is missing), the claim shapes, how another platform would issue or verify.
- Explicitly modelled on Smoke Signal's `community.lexicon.*` naming conventions — aim for shape compatibility even if the VC/Lexicon semantics differ.

#### 3c. **`dyad-berlin/open-patterns`** (stretch) — design pattern docs

- Publishable form of the structural moderation / feedback gate / reputation without scores / healthy-brain-notifications patterns.
- Already exists as `docs/design/design-principles.md` + solution docs in `docs/solutions/`. This is a packaging exercise — restructure for an external reader, strip Dyad-specific file paths, publish as a static site (could be GitHub Pages or Proof).
- Licence: CC BY 4.0.

### Draft: sequencing

- Week of 2026-04-21 → 3a (location package) — lowest effort, highest cost-of-delay if used as the "one live artefact" for M1.
- Week of 2026-05-05 → 3b (reputation VC vocabulary repo) — highest ecosystem signal.
- Week of 2026-05-19 → 3c (patterns site) if bandwidth allows; otherwise defer to M7.

### Decisions

- **[DECIDE]** Publish these under `dyad-berlin/*` on GitHub or spin up a `rebuild-infra/*` org? If Rebuild has no public infra org by mid-May, default to `dyad-berlin/*` with a commitment to donate/migrate later.
- **[DECIDE]** Do we host our own Nominatim instance (EU, self-hosted) or document third-party options in the README? Recommendation: document, do not commit to operating. Minimal-scope shared infra.
- **[DECIDE]** VC signing scheme: SD-JWT (aligns with EUDI Wallet stack) or Data Integrity Proofs? Recommendation: **SD-JWT** given Credo-TS support and eIDAS alignment.

### Dependencies

- M2 (IdentityService) is nice-to-have for 3b's reference issuer but not blocking — the issuer can stand alone.
- A public GitHub org decision precedes all three.

### Effort

- 3a: S–M (2–4 days, polishing + docs + NPM publish)
- 3b: M (1–2 weeks including schema design + reference issuer stub)
- 3c: M (1 week packaging)
- Total: ~3 weeks if sequential; compressible if parallelized.

---

## M4: PublicSpaces Conference, Amsterdam — **2026-06-04 to 06-06**

### Goal

Attend in person (travel-dependent). Present Dyad's extraction work if shortlisted; otherwise attend as observer + participant, meet jury members, meet other applicant teams.

### Deliverables (if shortlisted)

- A short pitch / demo (5–10 min typical for these venues).
- Slide deck built from the submission narrative.
- Live links to M3 artefacts.

### Decisions

- **[DECIDE]** Travel commitment: book contingent on shortlist notification? Or attend regardless? PublicSpaces Conference is worth attending independent of award outcome — recommendation: book tentatively.

### Effort

- 2 days prep if shortlisted; travel + 3 days in Amsterdam.

---

## M5: DWeb Camp proof-of-presence workshop — **2026-07-30 to 08-03**

### Goal

Use DWeb Camp (Alte Hölle, ~1 hour SW of Berlin) as the venue to publish a first draft of the **social proof-of-presence protocol** and gather collaborators. This is the single highest-leverage contribution Dyad could make to the broader ecosystem.

### Deliverables

1. **Protocol sketch (v0)** — a short specification document covering:
   - Threat model and design constraints (no GPS, no IP geo, no residency docs, VPN-neutral, inclusive of unstable-residency users).
   - Primitives: invitation-chain / web-of-trust vouching + capability-delegated attestations (UCAN-style or similar).
   - Three candidate mechanisms: (a) social vouching, (b) QR codes at public physical places, (c) short-lived capability tokens.
   - What the protocol *does not* do (explicitly — resist over-scoping).
2. **Reference implementation (minimal)** — in TypeScript, sized to demo rather than ship. Uses DIDs from M2/M3 identity work; issues and verifies attestations.
3. **Workshop / session proposal** for DWeb Camp — pitched as "prototyping an open social-proof-of-presence for local-first platforms."

### Draft: protocol shape

The MVP is probably not a formal RFC-style protocol document. It's a working library + a short README that captures the design constraints and invites alternative implementations. Think: **"an artefact that emerges from an implementation, not a spec ahead of implementation."**

Named collaborators to invite:
- Spritely Institute (capability-security alignment)
- Homebase.id (identity alignment)
- any Rebuild platform working on hyperlocal use cases
- academic PoL researchers from the Nature 2025 survey authors

### Decisions

- **[DECIDE]** Do we build this during the Dyad product sprint and extract, or build it standalone as a research project? Recommendation: **extract from product**. The Dyad regional-verification feature and this protocol are the same thing; building it twice wastes effort.
- **[DECIDE]** Submit an NGI Zero Commons Fund grant proposal for follow-on work on this protocol? Deadline check in next session.
- **[DECIDE]** DWeb Camp attendance / workshop proposal: confirm by ~2026-05-15.

### Dependencies

- M2 (IdentityService) helpful for a clean identity primitive in the reference implementation.
- Dyad's internal regional-verification product decision needs to have settled enough to extract.

### Effort

- Protocol sketch: M–L (2–3 weeks), best done with a co-author.
- Reference implementation: M (1–2 weeks).
- Workshop prep: S (2–3 days).
- Total: ~4–6 weeks, spread across May–July.

---

## M6: FediForum autumn demo — **date TBD (Sept/Oct 2026)**

### Goal

Lower-stakes public demo: show reputation VCs being issued from Dyad to an external verifier (could be a stub consumer, not production). Invite feedback from the W3C Social Web WG participants who overlap with FediForum.

### Deliverables

- A 15-minute demo session.
- An updated reputation VC vocabulary (v0.2 or v1.0) incorporating feedback from M3 publication and any PublicSpaces follow-up.

### Effort

- ~1 week prep, mostly slides + demo script.

---

## M7: Rebuild 3 Paris handoff — **2026-12-13 to 12-15**

### Goal

The working group publishes its **collective map** — the union of worked entries produced through the year — alongside whatever individual extraction artefacts (M3a, M3b, M5, and members' own) have landed. Governance for each artefact is named and handed off so nothing depends on any single person after Rebuild closes.

### Deliverables

1. **Collective map (v1)** — the shared artefact the working group has been accreting since M0. Lives at the `rebuild-adjacent-infra` index (or wherever M0 lands it). Published as a citable snapshot at Rebuild 3, with commitment to keep accreting past Dec.
2. **Consolidated interop toolkit** — a meta-repo or org README linking M3a, M3b, M3c, M5 and any other members' contributed artefacts. One navigable surface.
3. **Governance plan per artefact** — who maintains each, what licence, what contribution process. Options per artefact: (a) Rebuild-collective (if a governance structure exists at close-of-programme), (b) donation to an existing steward (Social Web Foundation, NLnet), (c) platform-governed with open contribution, (d) working-group-stewarded under whatever shape the group settles into.
4. **One-page "what changed" retrospective** — honest assessment of what the 2026 collective work produced vs. what was gestured at in M1.

### Decisions

- **[DECIDE]** Does the working group persist past Rebuild 3? If yes, under what lightweight governance? This should be socialized in the group by late summer.
- **[DECIDE]** Where does each artefact's governance land? Socialise with Rebuild organizers and artefact-leads by early autumn.

### Dependencies

- M3, M5, M6 all landed.
- Rebuild 3 programme finalized (likely by September 2026).

### Effort

- Consolidation + governance: ~2–3 weeks.
- Event prep: 1 week.

---

## Parallel track: ongoing codebase hygiene

Not milestones, but the drumbeat underneath everything:

- **Continue the sovereignty scorecard remediations** from `docs/design/shared-infrastructure-review-2026-03-25.md`. Status as of 2026-04-18:
  - ✅ Supabase EU region — confirmed Ireland (dashboard, 2026-04-18).
  - ✅ Self-host Leaflet assets — verified; CSS + icons served from `static/leaflet/`.
  - ✅ Extract hardcoded Supabase URLs — landed as part of M2 via PR #120.
  - ✅ Storage abstraction — landed as part of M2 via PR #120.
  - 🟡 Resend → EU email (Mailjet / self-hosted) — deferred; roadmap-level, needs its own plan. Resend is acceptable for the alpha cohort.
  - 🟡 GDPR data export / account deletion — not yet started. Separate plan needed.
  - 🟡 `adapter-node` for EU hosting alternative — deferred (shallow coupling per `docs/solutions/architecture/sovereignty-lessons-learned.md` §5).
  - 🟡 Bulk `auth.uid()` → `app.current_user_id()` rewrite — intentionally deferred per the wrapper's rollout rule.
- **CI-driven migrations** — migrate workflow (PR #113 + #115) is live; `supabase db push` now runs from GitHub Actions on merge to main. Removes the "migrations applied by whoever has the password on their laptop" ambiguity.
- **Keep domain model clean** as new features land — the portability of `src/lib/domain/` is the foundation everything else rests on.

---

## Open questions for the next session

Resolved in the original planning session (2026-04-17):
- ✅ Working group framing: **Rebuild-adjacent, by design** (wider aperture than Rebuild cohort alone).
- ✅ Room approach: **one dedicated public room on prefig.tech** for the working group, migration deferred.
- ✅ Dyad's framing in M1: **worked example, not subject**.

Resolved since (2026-04-18):
- ✅ **Supabase EU region verification** — confirmed Ireland via dashboard. Scorecard updated with sovereignty-spectrum caveat.
- ✅ **Coordination with the active worktree session** — three of four M2 pieces landed alongside the product work in a single merged week (PRs #107, #109, #111, #117, #118, #119, #120, #121). No conflicts. IdentityService plan explicitly sequences itself after #119 to avoid the remaining touch-area overlap.

Still to resolve before dropping into implementation:

1. **Submission voice and positioning** — individual vs organization, Theodore-authored vs Dyad-authored vs working-group-signed. Affects tone of the M1 narrative. Decide at M0 → M1 boundary.
2. **GitHub org strategy** — `dyad-berlin/*` vs `rebuild-adjacent-infra/*` (or similar collective org) from the start. Recommendation under the working-group frame: collective org from day one, even if sparsely populated initially. Names the aspiration in code.
3. **Budget / funding plan if no award** — do M3 artefacts still ship on the same schedule without the €10k? Probably yes for 3a, slower for 3b. Worth stating explicitly.
4. **Travel and time commitments** — PublicSpaces (June), DWeb Camp (July–Aug), FediForum (autumn), Rebuild 3 (December). All realistic?
5. **Rebuild governance channel** — is there an existing contact with Rebuild organizers to coordinate handoff timing and the adjacent-but-not-inside positioning?
8. **The first 3–5 targeted email recipients beyond Robin Berjon.** Pick by "sharpest specific read on one claim."

---

## Notes for the implementation session

When the next session picks this up:

- **The immediate next action is M0: form the working group.** One focused day. M1 narrative is better if M0 has coalesced even loosely by then.
- Drafts for the Matrix post and the targeted emails are in Appendix A and B — ready to edit and send rather than start from scratch.
- The three extraction targets (M3a/b/c) can start in parallel with M1 — they're independent workstreams.
- M2 code abstractions are deliberately scoped so they don't block or entangle with the submission. They're hygiene, not narrative. Coordinate with the active product worktree.
- Don't commit to M5 (DWeb Camp workshop) without an explicit go/no-go decision — it is the highest-ambition deliverable and the easiest to overcommit to.
- When in doubt about scope of an extraction artefact, default **smaller**. A tight, well-documented small thing outperforms a half-finished ambitious thing for this jury, this working group, and the Rebuild community.
- Under the working-group frame, resist the instinct to own everything. Put the first entry out, synthesise when there are 3+, then hand the pen off.

## Artefacts referenced from this plan

- `docs/research/2026-04-17-interop-deep-review.md` — substance behind most of these milestones
- `docs/research/interoperability-and-open-infrastructure.md` — broader framing
- `docs/design/shared-infrastructure-opportunities.md` — original extraction vision
- `docs/design/shared-infrastructure-review-2026-03-25.md` — sovereignty scorecard, codebase assessment
- `docs/solutions/architecture/sovereignty-lessons-learned.md` — pragmatic checklist
- `docs/design/design-principles.md` — structural design choices worth extracting as patterns

---

## Appendix A — Draft: Matrix post to convene the working group

> Hey all — proposing something small and specific.
>
> I've just done a systems-architect pass on where dyad.berlin sits in the open-social / interop / shared-infrastructure landscape — what we're building, what we're refusing, what seams we've identified, what gaps we've hit that feel unsolved. Deep review + plan: [links].
>
> It reads as one worked entry on a map we don't yet have. I think we could build that map together.
>
> **Proposal:** treat this room (or a clean new one, if anyone wants) as a lightweight Rebuild-adjacent working group. Not a community. Not a newsletter. A group with a specific organizing question:
>
> *"For the kind of platform we're each building — small, values-aligned, resisting the typical growth dynamics — what are we building, what are we refusing, what do we need, and what's not being built that should be?"*
>
> Dyad is one worked entry. If even three or four of you did a pass on your own project in whatever form suits you — a doc, a post, a ten-minute async voice note, a napkin sketch of your seams and gaps — the union is the artefact this ecosystem doesn't yet have. And we'd have it in time for Open Social Awards (May 1), PublicSpaces (June), DWeb Camp (July–Aug), Rebuild 3 (Dec) to use externally.
>
> **What I'm explicitly not doing:**
> - Running meetings.
> - Holding the pen on the collective map as a solo editor.
> - Building a brand around this.
>
> **What I am doing:**
> - Putting mine out first so the shape is concrete.
> - Offering to synthesise a first pass of the collective map once there are 3+ entries, then handing the pen off.
> - Naming the external deadlines we can ride on so the calendar does the forcing, not any individual.
>
> If this resonates — react, or reply with "in" — no shape required yet. If you want to contribute your worked entry in any form, I'll thread them. If the frame is off, push back; happy for it to reshape into whatever actually serves the room.
>
> — T

## Appendix B — Draft: targeted email to close readers (Robin Berjon-shape)

Send a shape-equivalent (not identical) email to each of 3–5 close readers, with the claim-to-attack chosen for each recipient's specific expertise.

> **Subject:** A worked entry on a map we don't yet have — would value yours
>
> Hi [name],
>
> Writing with something concrete and small, not a catch-up.
>
> I've just done a systems-architect pass on where dyad.berlin — the bounded regional in-person conversation platform I'm building out of Sofinnova — sits in the open-social interop landscape. Research doc + plan: [links].
>
> I'm treating it as one worked entry on a map that doesn't yet exist — what small values-aligned platforms are building, refusing, needing, missing. Proposing to [room] that we accrete entries into a shared map through the year, aiming for Open Social Awards (May 1), PublicSpaces (June), and Rebuild 3 (Dec) as external moments to point it at.
>
> Two asks, either one is plenty:
>
> 1. **Fifteen minutes of your skepticism on one specific claim in mine** — [for Robin, pick one: (a) `did:web` + VCs is the right AT Protocol adoption for a platform with Dyad's constraints; (b) social proof-of-presence for local-first platforms is a genuine infrastructure gap not a solved problem I'm missing].
> 2. **Your worked entry** — in whatever form suits you (doc, post, async voice note, napkin sketch of seams + gaps). Doesn't have to mirror mine; the point is the union.
>
> "No bandwidth" is a perfectly good answer. I'll keep you looped into the Rebuild 3 Paris moment regardless.
>
> Best,
> T

## Appendix C — Session boundary note (2026-04-17)

This plan is the artefact left by the research session that produced `docs/research/2026-04-17-interop-deep-review.md`. The next implementation session picks up with **M0** — one focused day to stand up the room, post, send the emails, and stub the shared index — and proceeds to M1 narrative drafting. All source research, URLs, and the three sub-agent reports that produced the deep-review are in the conversation that created this file; re-spawn research agents only if the ground has shifted.
