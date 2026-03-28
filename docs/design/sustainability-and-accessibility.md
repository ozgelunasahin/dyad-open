# Sustainability & Accessibility

How dyad sustains itself without betraying what it's for.

## Business Model Principles

**Subscription, not attention.** Dyad charges a subscription. This is a deliberate structural choice: a platform funded by advertising needs to maximise time-on-screen, which directly contradicts the "enabler, not replacement" principle. A platform funded by data sales needs to collect and monetise user behaviour, which contradicts the sovereignty and privacy commitments. Subscription aligns the incentive: dyad succeeds when people value the service enough to pay for it, not when they can't stop scrolling.

**Never:** advertising, sponsored content, data sales, engagement optimisation, dark patterns for retention.

## Accessibility

Frieda's challenge (see `docs/design/user-archetypes.md`) is real: "How can you ask people to pay for connection when they're struggling with basic needs?" Connection cannot be a premium feature. But infrastructure costs money. The tension is genuine and must be held, not resolved with a slogan.

### Solidarity Pricing

Tiered subscription where those who can pay more, do. Not a "discount for the poor" — framed as community solidarity. The people who pay full price are contributing to the commons, not subsidising charity.

### Open Conversations (v0.2+)

Some conversations can be open to non-members. This serves multiple purposes:

1. **Engagement and outreach.** Founders can publish conversations on the site and let non-members book a time to come and meet them. This is how the first community is built — through real conversations, not marketing. It's an opportunity to talk about the platform, its values, and to hear people's wants and hesitations directly.

2. **Ambassadorship.** As the platform evolves, established and trusted users can also make their conversations open to non-members. These are ambassadors to the community — people whose track record of good meetings gives them the credibility to invite the outside in.

3. **Lowering the barrier.** A non-member can experience the core of what dyad offers — a real conversation with a real person — before deciding whether to join. The platform sells itself through what it does, not through what it promises.

**Implementation note:** Open conversations need a distinct flow — no login required to view, a lightweight booking mechanism (email-based?), and the open/closed distinction must be clearly communicated in the UI. This is a significant feature that should be designed carefully, not bolted on.

## Urban Ecosystem

Dyad exists in cities. The meetings happen in physical places — cafes, parks, libraries, bookshops. The platform can be a participant in the urban ecosystem, not just a layer on top of it.

### Venue Partnerships

People setting up a meeting via dyad at a partnered venue get a code for a free coffee (or equivalent). This addresses two things:

1. **The cost of existing in public.** You have to pay to sit somewhere. A coffee code removes the transactional frame from the meeting — you're there to talk, not to be a customer.

2. **Supporting the spaces themselves.** Cafes, independent bookshops, community spaces — these are the physical infrastructure of urban social life. Dyad can direct traffic to them, support them, and be selective about which places it partners with.

### Partner Selection Principles

- **Local over chain.** Support independent businesses, not franchises.
- **Discovery.** Send people to places they may not know about. The meeting location becomes part of the encounter — a new neighbourhood, a bookshop where the meeting might also lead to a sale, a cafe that hosts community events.
- **Mutual benefit.** The venue gets foot traffic and community association. Dyad gets a physical presence and a reason for people to show up. The user gets a free coffee and a place to be.
- **Values alignment.** Partners should share something of dyad's ethos — community-oriented, independent, contributing to the city's social fabric.

### Long-term Vision

Dyad as part of a thriving urban habitat. Not a tech company that happens to operate in Berlin, but civic infrastructure that is *of* the city — connected to its bookshops, its cafes, its parks, its community spaces. The digital layer is minimal and intentional; the physical layer is where the value actually lives.

## Portable Reputation (Future, Handle With Care)

As discussed in `docs/design/interoperability-and-open-infrastructure.md`, a user's reputation (meeting history, feedback, reliability signals) could in principle be made portable — transferable to other platforms via Verifiable Credentials or similar mechanisms.

**The opportunity:** A person who has built trust through dozens of good meetings on dyad could carry that trust into other contexts. This is genuinely valuable and aligns with the interoperability vision.

**The danger:** Commoditisation. The moment reputation becomes a transferable asset, it becomes something people optimise for. Good meetings become a means to an end (building a "score") rather than an end in themselves. The feedback becomes performative. The conversation becomes a transaction.

**Current position:** Tread skillfully, with an open mind about what's possible. The technical architecture should not prevent portability (use discrete signals, not scores; use standards-compatible formats). But the feature should not be built until there is a clear understanding of what it does to the incentive structure. The question is not "can we?" but "what happens to the meetings when we do?"

## Design Implications

| Decision | Rationale |
|----------|-----------|
| Subscription model | Aligns incentive with value delivered, not attention captured |
| No ads, no data sales, ever | Structural commitment, not a marketing claim |
| Solidarity pricing | Accessibility without charity framing |
| Open conversations | Non-members can experience dyad before joining; founders and ambassadors as community bridge |
| Venue partnerships | Support urban social infrastructure; remove transactional frame from meetings |
| Local over chain | Values-aligned partner selection |
| Portable reputation (future) | Technically possible, philosophically dangerous — proceed with care |

## Sources

- User research: Frieda's accessibility challenge (`docs/design/user-archetypes.md`)
- Interoperability: `docs/design/interoperability-and-open-infrastructure.md`
- Design principles: "Why This Exists" (`docs/design/design-principles.md`)
