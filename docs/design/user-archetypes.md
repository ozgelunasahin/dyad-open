# User Archetypes & Motivations

From user research interviews, March 2026. Four archetypes emerged — not as boxes to put people in, but as lenses for understanding what draws different people to dyad and what might push them away.

## The Archetypes

### Seeker

**Profile:** Curious, reflective, often solitary by habit. Reads a lot, spends time in their own head. May have a good social life but feels discontent with the *quality* of interactions.

**Motivation:** Intellectual stimulation and depth. Conversation as a craft. Seeking the kind of exchange that makes you feel less isolated in your thoughts — not less alone in a room, but less alone in what you're thinking about.

**Archetype quote (Jackson):**
> "I have a good social life, but I feel discontent with the types of interactions I'm having. I spend a lot of time in my head. I do actually seek these conversations."

**Hesitation:** *What kind of people are in this community?* The seeker needs to trust that the community has depth before investing. They're making a real investment — emotionally, not just time.

**Design implication:** The quality of the writing on the discover page IS the signal. The prompts themselves demonstrate who's here and what kind of thinking happens. No need to sell — just show.

---

### Explorer

**Profile:** Wants experiences, wants to meet new people, but doesn't enjoy small talk. Looking for a way to meet people *differently* — outside the established scripts of dating, networking, or friendship-building.

**Motivation:** Connection without the weight of social performance. Wants to feel less alone without having to perform being social.

**Archetype quote (Miri):**
> "I hope I can meet and just sit with someone, maybe also in silence. There isn't an expectation about how we are supposed to hit it off. We can be weird and be ok with never seeing each other again."

**Hesitation:** Fear of exhausting conversations with people who want to debate and intellectualise. The explorer is drawn to openness, not rigour. They want presence, not performance.

**Design implication:** The platform must not signal that you need to be clever or well-read to participate. Miri's fear is the direct inverse of Jackson's motivation — the design must hold both. Copy, onboarding, and prompt examples need to make room for silence, simplicity, and "just being there" as valid meeting outcomes.

---

### Gatherer

**Profile:** Already socially active. Involved in community work, organising, bridge-building. Has experienced how communities can become insular despite good intentions.

**Motivation:** Wants to connect across divides, not within bubbles. Wants to improve their own ability to meet people who aren't like them — and bring that skill back into their community work.

**Archetype quote (Frieda):**
> "I worry that I am forgetting how to connect with people because I am part of a community that has such a shared language — that both facilitates and also limits the way we relate to one another."

**Hesitation:** Two concerns. First: *reinforcing apartness* — just connecting with people from the same social circles and calling it outreach. Second: *accessibility and cost* — asking people to pay for connection when they're struggling with basic needs. "Not more tech bullshit."

**Design implication:** The platform must actively resist becoming a bubble. This means: no algorithmic curation that optimises for similarity. No filtering by "interests" or "identity." The discover page should feel like a city — you encounter who's there, not who's like you. On accessibility: connection must never be gated behind ability to pay. Solidarity pricing and open conversations address this — see `sustainability-and-accessibility.md`.

---

### In-Betweener

**Profile:** In a transitional phase. Between cities, between social circles, between versions of themselves. Doesn't fit with their old crowd, hasn't found their new one. Drawn to liminal spaces.

**Motivation:** Finding community on their own terms. Not based on personality tests or identity categories — let people's complexity shine through from what they say.

**Archetype quote (Deniz):**
> "I want to do it my way, on my own terms. Not based on the basis of some personality test. Let people's complexity shine through from what they say."

**Hesitation:** Curation anxiety. Who's really in this community? Are the highlighted people representative, or is it a curated front? Deniz wants to see real people — their words, their feedback on meetings. Not polished marketing.

**Design implication:** Authenticity in how the community is presented. Show real prompts, real words, real feedback. No stock photography of attractive people. The landing page should feel like looking through a window into actual conversations, not a brochure. Community visibility matters: let people see who's here through what they've written, not through curated profiles.

---

## The Common Ground

All four archetypes look different on the surface but are bumping against the same wall: the way our social infrastructure sorts us before we even meet. Jackson's solitary reading, Miri's doom-scrolling, Frieda's bubble-that-won't-bridge, Deniz's "don't fit with the old, haven't found the new" — these are all symptoms of the same sorting.

What they share is not a desire for "authentic connection" (a term that has been emptied by the platforms that prevent it). It's a need to find safety, validation, and belonging in their commonality with *all* people — not just people like them. The tension is that forming cliques is the comfortable local minimum. The harder, more valuable thing is what Frieda names directly: connecting across divides, not within bubbles.

The conversation prompt is the structural answer to this. It's not a shared interest (that's a clique-forming mechanism). It's a shared question — and a question is inherently open in a way that an interest or identity category is not.

See `docs/design/design-principles.md` — "Why This Exists" — for how this shapes every design decision.

## Cross-Cutting Tensions

### Depth vs. Openness
Jackson (seeker) wants intellectual depth. Miri (explorer) fears exactly that — exhausting conversations with people who intellectualise. **Both must feel welcome.** The platform cannot brand itself as "for thinkers" without losing Miri. It cannot brand itself as "just vibes" without losing Jackson. The prompt is the bridge: it lets the seeker go deep while the explorer can respond with something simple and real.

### Community vs. Bubble
Frieda (gatherer) specifically fears that dyad becomes another echo chamber. Deniz (in-betweener) wants to see the real diversity of who's here, not a curated subset. **No interest-matching. No similarity algorithms. No "people like you" recommendations.** The discover page is a commons, not a feed.

### Visibility vs. Privacy
Deniz and Jackson both want to know who's in the community before committing. But the platform also values pseudonymity and low-pressure participation. **Resolution:** People are visible through their writing and their meeting feedback, not through profiles or bios. You learn about someone by reading what they care about — not by reading a self-description.

### Accessibility vs. Sustainability
Frieda challenges the platform directly: how can you ask people to pay for connection? **Design principle:** Connection must never be gated behind ability to pay. Subscription with solidarity pricing, open conversations for non-members, venue partnerships that remove the cost of existing in public. See `sustainability-and-accessibility.md`.

---

## Design Implications Summary

| Insight | Implication | Affects |
|---------|------------|---------|
| Miri fears intellectualising | Copy must not signal cleverness as a prerequisite | Landing page, RotatingHeadline (#081), onboarding |
| Jackson asks "who's here?" | Show real prompts and real words on landing page | Landing page, public discover |
| Deniz wants complexity from what people say | The prompt IS the identity — not profiles, not bios | Conversation detail, discover cards |
| Frieda fears echo chambers | No interest matching, no similarity algorithms | Discover feed, future recommendation work |
| Deniz suspects curation | Show real community members, not polished marketing | Landing page, testimonials |
| Miri wants silence to be ok | Meeting outcomes are undefined — no success metrics | Feedback form copy, design principles |
| Frieda asks about accessibility | Subscription model with solidarity pricing; open conversations for non-members; venue partnerships to remove cost of existing in public. See `sustainability-and-accessibility.md` | Business model, pricing, venue partnerships |
| All four want low pressure | No forced follow-up, no "did you exchange numbers?" | Post-meeting flow, feedback form |
| Deniz rejects personality tests | No categorisation, no interest tags, no matching | Architecture, discover algorithm |
| Jackson is "making an investment" | The platform must reward the investment with quality | Content moderation, community standards |

## Questions for Testers

Derived from the research:

1. **What did you write on the waitlist form?** (What drew you here?)
2. **What are your frictions and hesitations?** (What almost stopped you?)
3. **Where did you hear about dyad?** (Channel matters for archetype distribution)

## Sources

- User research interviews, March 2026
- Profiles: Miri (explorer), Frieda (gatherer), Jackson (seeker), Deniz (in-betweener)
