# Roadmap

## v0.1 — Alpha Playtest (current)

**Goal:** A select group of testers can complete the full user journey — discover, respond, invite, meet, give feedback — and provide meaningful feedback on the experience.

**Operating constraint:** Must run unattended for weeks. The main developer will have limited availability. A non-technical co-founder (admin) must be able to operate the platform from an in-app admin panel. No database surgery, no curl commands.

### Feature status

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page with conversation previews | DONE | Anon visitors see real conversations, vague slots before response |
| Waitlist form | DONE | Saves to `contacts` table |
| Invite-based registration | DONE | Fixed signup RPC (migration 20260411) |
| Discover page (list + map + search) | DONE | List + map + date filter + search overlay |
| Conversation editor + publish flow | DONE | TipTap, cover image upload, slot scheduling |
| Response-first invitation flow | DONE | Vague slots before response, full reveal after |
| Author accepts invitation → meeting | DONE | |
| Meeting detail with location reveal | DONE | Maps link, calendar export |
| Feedback form + gate | DONE | 4-step state machine, adjective vocabulary, gate middleware |
| Simultaneous feedback reveal | DONE | Inline reveal on feedback page |
| In-app feedback/report button | DONE | FeedbackModal in all layout groups |
| Admin panel (waitlist, invite, feedback) | DONE | Waitlist management, user invites, feedback viewer |
| Security fixes (RLS, function grants) | DONE | 10 security migrations, column-level access, anon profile revocation |
| Progressive slot disclosure | DONE | Vague slots (day + area) before response, full after |
| Centralized copy (`copy.ts`) | DONE | 211 lines, organized by route, prep for localization |
| Mobile Playwright tests | DONE | Multi-viewport test harness (desktop + mobile), 26 E2E tests |
| Profile page with full actions | DONE | Calendar filter, search, + button, inline meeting context |
| Production email delivery | **DEFERRED v0.1.x** | Mailpit only — needs EU provider |
| Remote Supabase migrations | **DEFERRED v0.1.x** | Not yet applied to production |
| Waitlist modal on landing page | **DEFERRED v0.2** | Not blocking alpha |
| BottomSheet non-blocking | **DEFERRED v0.2** | Needs proper solution |
| Invitation decline button | **DEFERRED v0.2** | Authors can only accept or ignore |
| Email notifications | **DEFERRED v0.2** | Invitation received, accepted, cancelled |
| Performance optimizations | **DEFERRED v0.2** | Query parallelization in discover + detail |

**Detailed implementation plan:** `docs/plans/2026-03-28-feat-v01-release-readiness-plan.md` (archived)

### Explicit non-goals for v0.1
- Public profiles
- Open conversations for non-members
- EN/DE localization (but copy centralization prepares for it)
- Onboarding flow
- Notifications UI (bell icon)
- Venue partnerships
- Solidarity pricing

---

## v0.1.x — Alpha Fixes (during 2-week test)

**Goal:** Fix critical issues reported by testers. Made by the main developer when available, or by the co-founder using Claude Code for straightforward fixes.

**Driving factors:**
- Tester feedback via the in-app report button
- Admin observations from the admin panel
- Bugs that block the core journey

**Scope:**
- Bug fixes that prevent testers from completing the journey
- Copy/wording changes (via centralized `copy.ts`)
- CSS/spacing fixes
- Email template adjustments
- Admin panel improvements based on usage

**Ways of working:** CLAUDE.md is the primary handoff document. The co-founder works with Claude Code against the `main` branch, always via PRs (never direct commits). See "Ways of Working" section in CLAUDE.md.

---

## v0.2 — Post-Alpha (informed by 2 weeks of tester feedback)

**Goal:** Address tester feedback, add features that deepen the experience, prepare infrastructure for growth.

**Driving factors:**
- What testers actually struggled with (from in-app feedback and admin observations)
- What testers asked for (feature requests)
- What the archetypes need (see `docs/design/user-archetypes.md`)
- Infrastructure readiness for up to 1000 users

### Features
- **Open conversations** — founders and ambassadors can make conversations visible to non-members. Non-members book a time, experience the real thing, then get invited to join. This is the growth mechanism and the accessibility answer.
- **Public profiles** — visible reputation through meeting history and feedback. Users choose what to display.
- **EN/DE localization** — copy stored in database, admin-editable, keyed by locale.
- **Decline invitation** — "Not this time" button for authors, with notification to inviter.
- **Notifications UI** — bell icon, notification list. Backend already exists.
- **Onboarding** — first-run guidance for new users. Not tutorial modals — something organic.

### Infrastructure (1000 users)
- Database indexing for discover feed queries
- Connection pooling (Supabase already handles, but verify limits)
- Query optimization (eliminate sequential waterfalls identified in v0.1 review)
- Cache rendered `body_html` in database (eliminate per-request TipTap + DOMPurify)
- Lazy-load Leaflet (150KB chunk currently loaded on every discover page visit)
- Rate limiting on write endpoints (Cloudflare-level or KV-based)
- Monitoring and alerting (durable `events` table + admin view for alpha funnel — see PR D scope)
- CDN for cover images (Supabase Storage + Cloudflare)

### Interop hygiene (preserves optionality at near-zero cost)

Adopted now because each pays for itself on maintainability grounds; interop readiness is the bonus. See `docs/research/2026-04-17-interop-deep-review.md` Part III for the seam-level audit.

- **`IdentityService` abstraction** (~4–6 hrs) — wrap `locals.user` reads (~40 call sites) behind an opaque `UserIdentity`. Enables a later DID swap, OIDC migration, or eIDAS wallet integration as a one-line factory change. Best folded into PR C while we're already touching auth surfaces.
- **`StorageService` abstraction** (~10–14 hrs) — isolate the 15+ hardcoded `*.supabase.co` URLs and direct `supabase.storage` calls behind `{upload, getPublicUrl, delete}`. Unblocks regional instances and avoids a future find-and-replace landmine.
- **Extract `location.ts` as a standalone NPM package** (~2 hrs) — already clean, Rebuild-extractable, makes "building in the open" concrete.
- **Explicit non-goals for v0.2:** running a PDS, AT Protocol Lexicon publication, federation. All deferred per deep-review verdict (wait for IETF standardization, EU-operated relay, private records).

### Business
- Solidarity pricing implementation (3 tiers, same features)
- Steward ownership paperwork
- Venue partnership pilot (5-10 hand-curated Berlin venues)

---

## v0.3+ — Growth & Interoperability (future)

Reference: `docs/research/2026-04-17-interop-deep-review.md` — sequenced against the 2026 ecosystem calendar (DWeb Camp, NGI Fediversity, W3C Social Web WG, Rebuild 3 Paris).

### Product

- Venue partnerships at scale
- Multi-region support (beyond Berlin)
- Calendar integration (`.ics` export, Google/Outlook deep links)
- Group conversations (beyond dyadic)

### Identity

- **`did:web` user identifiers** — chosen over `did:plc` (no Bluesky/PLC dependency). Users get a portable identifier before any federation commitment.
- **OID4VCI / OID4VP** relying-party integration for the EU Digital Identity Wallet (eIDAS 2.0). Target: production-ready coverage 2027, depending on Member State rollout. Use Credo-TS in the SvelteKit server.

### Reputation

- **Reputation-as-Verifiable-Credentials** (~2–4 weeks, informed by alpha feedback). Publish a JSON-LD `@context` + claim schemas (attendance, reliability, testimonial signals) under an open licence, with Dyad's feedback flow as the reference issuer. Venues: FediForum demo, W3C Credentials CG submission, Rebuild 3 handoff. Blocked by: we need real tester feedback first to know which claims matter.
- **Scope note:** W3C VCs, not AT Protocol labels. The two are complementary — structured claims vs community-norm flags.

### Proof-of-presence

- **City-scoped social proof-of-presence protocol** — invitation-chain + capability-delegated attestations (UCAN-style). MVP scope: vouching chain + per-origin capability tokens, not a full protocol specification. **Target: first draft at DWeb Camp 2026 (July 30–Aug 3, an hour SW of Berlin).**

### Moderation

- **EU-hosted, open-source moderation API** — too large to build alone. Be an opinionated early user and co-funder. Co-sign an NGI0 Entrust proposal with Bonfire, Mobilizon community, or Gancio. Publish Dyad's specific requirements (cover-image moderation slice) as a public spec-fragment.

### Funding & venues (2026 calendar)

- **NGI Fediversity** open calls — €5k–€50k for EU interop work. Next deadline after April 1, 2026 missed.
- **DWeb Camp 2026** (July 30–Aug 3) — demo proof-of-presence sketch.
- **FediForum** autumn — demo reputation VCs.
- **Rebuild 3 Paris** (Dec 13–15, 2026) — publish the interop toolkit as open-sourced Rebuild materials; hand off governance.

### Explicit deferrals

- **Running a Dyad PDS** — revisit year-end 2026 after IETF standardization + EU-operated relay + private records ship.
- **ActivityPub federation** — W3C Social Web WG is revising the spec through Q3 2026; watch, don't commit.
- **Building the moderation API ourselves** — too large for a side project; structural moderation gives a long runway.

---

## Sources

- User archetypes: `docs/design/user-archetypes.md`
- Design principles: `docs/design/design-principles.md`
- Sustainability model: `docs/design/sustainability-and-accessibility.md`
- v0.1 gap analysis: `docs/plans/2026-03-28-feat-v01-release-readiness-plan.md`
- v0.1 consolidation: `docs/plans/2026-03-27-docs-v01-release-consolidation-plan.md`
- Interop deep review: `docs/research/2026-04-17-interop-deep-review.md`
- Interop baseline research: `docs/research/interoperability-and-open-infrastructure.md`
- Readiness review (2026-04-16): PR A `docs/plans/2026-04-16-001-fix-security-reliability-sweep-plan.md`
- User stories: `docs/stories/001-004`
