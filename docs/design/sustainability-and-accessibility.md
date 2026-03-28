# Sustainability & Accessibility

How dyad sustains itself without betraying what it's for.

## Business Model Principles

**Subscription, not attention.** Dyad charges a subscription. This is a deliberate structural choice: a platform funded by advertising needs to maximise time-on-screen, which directly contradicts the "enabler, not replacement" principle. A platform funded by data sales needs to collect and monetise user behaviour, which contradicts the sovereignty and privacy commitments. Subscription aligns the incentive: dyad succeeds when people value the service enough to pay for it, not when they can't stop scrolling.

**Never:** advertising, sponsored content, data sales, engagement optimisation, dark patterns for retention.

**Transparency:** Publish the financials. Show what it costs to run, where the money goes. Ghost (the publishing platform) demonstrates that a transparent nonprofit structure can charge money without feeling extractive. Their framing — "reader-driven, subscription-funded models are re-aligning incentives and bringing communities back together" — applies directly to dyad.

**Legal structure:** A German eingetragener Verein (e.V.) or Genossenschaft (cooperative) signals civic intent in a way that a GmbH cannot. The legal form IS the message in Berlin's civic landscape. No venture capital (which requires growth and exit). Consider the Open Food Network model: a multi-stakeholder cooperative running open-source software.

## Accessibility

Frieda's challenge (see `docs/design/user-archetypes.md`) is real: "How can you ask people to pay for connection when they're struggling with basic needs?" Connection must never be gated behind ability to pay. But infrastructure costs money. The tension is genuine and must be held, not resolved with a slogan.

### Solidarity Pricing

Three tiers, identical features. The difference is your relationship to the commons, not the product you receive.

**Framing matters.** Bad: "Basic / Standard / Premium" (implies the cheap tier gets less). Bad: "Subsidized / Regular / Supporter" (stigmatises the low tier). Good: all tiers get the same product; the higher tier funds the lower.

**Suggested structure:**
- **Community rate:** 3-5 EUR/month. No justification required.
- **Sustaining rate:** 7-9 EUR/month. What it actually costs per user.
- **Solidarity rate:** 12-15 EUR/month. "Your contribution keeps dyad accessible."

**Show the math:** "It costs X EUR per month per user to run dyad. If you can pay more, you make it possible for someone else to pay less. If you need to pay less, others have made that possible for you."

**No verification.** Do not ask people to prove they need the low tier. Self-selection works when the framing is right — demonstrated by CSA farms, sliding-scale therapy, and Karma Kitchen (a gift economy restaurant operating since 2007 where guest contributions consistently cover or exceed costs).

**Annual option** with a meaningful discount. Improves sustainability forecasting.

### Open Conversations (v0.2+)

Some conversations can be open to non-members. This serves multiple purposes:

1. **Engagement and outreach.** Founders publish conversations on the site and let non-members book a time to come and meet them. This is how the first community is built — through real conversations, not marketing. It's an opportunity to talk about the platform, its values, and to hear people's wants and hesitations directly.

2. **Ambassadorship.** Established and trusted users can also make their conversations open to non-members. Ambassador status is earned through meeting history and feedback quality, not applied for. No "ambassador program" branding — the privilege emerges from consistent good participation.

3. **Lowering the barrier.** A non-member experiences the real thing — not a demo. They book a slot, show up, have a conversation, give feedback. The feedback gate applies. They experience the full structure. After completing an open conversation, they receive a simple invitation to join. No urgency, no discount. The meeting itself is the pitch.

**Guardrails:**
- An ambassador can have one open conversation at a time. Prevents flooding.
- The invitation is personal, not viral. Non-members come to meet a specific person about a specific question, not to "check out a platform." This prevents the Clubhouse dynamic (FOMO-driven growth that collapsed when exclusivity was removed).
- Monitor the ratio: if open conversations exceed ~15-20% of the total, the community character shifts. This is the dilution metric.
- Conversion happens through experience, not pitch.

**Implementation note:** Open conversations need a distinct flow — no login required to view, a lightweight booking mechanism (email-based), and the open/closed distinction clearly communicated in the UI. Significant feature, design carefully.

Reference: Bluesky's invite-based seeding worked because it selected for people who actively wanted to be there, and these early communities shaped the platform's culture. When open registration came, the cultural foundation held.

## Urban Ecosystem

Dyad exists in cities. The meetings happen in physical places. The platform is a participant in the urban ecosystem, not a layer on top of it.

### Venue Partnerships

People meeting via dyad at a partnered venue get a code for a free coffee (or equivalent).

**The power dynamic is inverted:** Dyad pays the venue, not the other way around. The coffee code is a cost dyad bears (funded by solidarity-tier subscriptions). The venue is never a customer or an advertiser. This prevents the Yelp/Groupon trap entirely:
- No commission (Groupon takes 40% of already-discounted prices)
- No race to the bottom on price
- No review weaponisation

**Venues are not rated.** There is no review system for partner venues. The venue is a setting for a meeting, not a product being evaluated.

**No venue advertising in the app.** Partner venues appear as meeting locations, not sponsored content. The relationship is visible (the coffee code makes it explicit) but not promotional.

### Partner Selection Principles

- **Local over chain.** Support independent businesses, not franchises.
- **Discovery.** Send people to places they may not know about. A new neighbourhood, a bookshop where the meeting might also lead to a sale, a cafe that hosts community events.
- **Mutual benefit.** The venue gets foot traffic and community association. Dyad gets physical presence. The user gets a place to be without the transactional frame.
- **Values alignment.** Partners share dyad's ethos — community-oriented, independent, contributing to the city's social fabric.
- **Start with 5-10 venues.** Hand-curated. Each chosen because you would personally want to have a conversation there. Quality over quantity. This is a commons, not a marketplace.

### Long-term Vision

Civic infrastructure that is *of* the city. The digital layer is minimal and intentional; the physical layer is where the value lives. Connected to bookshops, cafes, parks, community spaces. Decidim (Barcelona) is the reference: digital infrastructure built by and for the city, now used by 150+ institutions worldwide. The software is open; the local processes are specific to place.

## Portable Reputation (Future, Handle With Care)

As discussed in `docs/design/shared-infrastructure-opportunities.md`, a user's reputation could in principle be portable via Verifiable Credentials.

**The opportunity:** Trust built through dozens of good meetings, carried into other contexts. The EU Digital Identity Wallet (eIDAS 2.0, mandatory by 2027) creates a real technical pathway: dyad issues a signed credential, the user holds it in their wallet, presents it where they choose.

**The danger confirmed by research:** Reputation portability has a "duality" problem (Teubner et al., Electronic Markets 2024). Imported ratings have only ~35% of the trust-building effect of native ratings. Portability disproportionately benefits "superstars," creating cross-market concentration. And Couchsurfing showed what happens when platform-bound reputation gets locked behind a paywall — users lose access to trust they earned.

**If we issue credentials, make them binary and contextual:**
- "Has completed 10+ meetings on dyad Berlin" (yes/no, not a score)
- "Has never had a no-show" (behavioural signal, not a rating)
- "Member since 2026" (duration, not achievement)
- Never: "Average feedback rating: 4.7/5" (this is the commodification trap)

**Reputation stays on dyad by default.** Portability is opt-in, per-credential, user-initiated. No bulk export.

**Account deletion does not erase issued credentials.** If reputation is user-held (via VCs), the platform cannot hold it hostage. This aligns with GDPR data portability and resolves the Couchsurfing failure mode.

**Current position:** The architecture should not prevent portability (discrete signals, not scores; standards-compatible formats). The feature should not be built until we understand what it does to meeting quality. The question is not "can we?" but "what happens to the meetings when we do?"

## Design Implications

| Decision | Rationale |
|----------|-----------|
| Subscription model | Aligns incentive with value delivered, not attention captured |
| No ads, no data sales, ever | Structural commitment, not a marketing claim |
| Solidarity pricing (3 tiers, same features) | Accessibility without charity framing; show the math |
| Transparent financials | Trust through visibility, Ghost model |
| e.V. or cooperative legal structure | Civic intent in legal form; no VC |
| Open conversations | Non-members experience the real thing; founders and ambassadors as bridge |
| Ambassador status earned, not applied for | Quality over program; one open conversation at a time |
| Venue partnerships (dyad pays venue) | Inverted power dynamic; no Yelp/Groupon trap |
| Venues not rated | Setting, not product; prevent review weaponisation |
| Start with 5-10 hand-curated venues | Commons, not marketplace |
| Portable reputation via VCs (future) | Binary signals, not scores; opt-in; user-held |

## Sources

- User research: Frieda's accessibility challenge (`docs/design/user-archetypes.md`)
- Shared infrastructure: `docs/design/shared-infrastructure-opportunities.md`
- Design principles: "Why This Exists" (`docs/design/design-principles.md`)
- Ghost: transparent nonprofit publishing platform — [ghost.org](https://ghost.org/)
- Resonate: stream-to-own cooperative — [resonate.coop](https://resonate.coop/)
- Open Food Network: multi-stakeholder cooperative — [openfoodnetwork.org](https://openfoodnetwork.org/)
- Karma Kitchen: gift economy restaurant since 2007 — [karmakitchen.org](https://www.karmakitchen.org/)
- Decidim: Barcelona's participatory democracy infrastructure — [decidim.org](https://decidim.org/)
- Bluesky: invite-based culture seeding — [bsky.app](https://bsky.app/)
- Teubner et al. (2024): "The Duality of Reputation Portability" — Electronic Markets, Springer
- eIDAS 2.0: EU Digital Identity Wallet — [eudi-wallet.eu](https://www.eudi-wallet.eu/)
- Couchsurfing paywall failure: Stanford/IEEE research on reputation lock-in
