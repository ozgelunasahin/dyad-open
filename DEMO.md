# dyad. — Investor Demo Walkthrough

**Branch:** `dyad-rough-redesign-day-2`  
**Prepared for:** Theodore  
**Date:** June 2026  

---

## Access

The app requires an account. Use the credentials Özge shared separately, or ask her to add you as a member before the call.

URL: `http://localhost:5173` (local) or the Cloudflare Pages preview URL on this branch.

---

## What you're looking at

dyad is infrastructure for community-governed social spaces — built for groups that want the depth of a club and the reach of a platform, without handing control to a VC-backed company.

The demo is populated with a Berlin community ("dyad Berlin") and three peer organisations (PublicSpaces, Rebuild, Kreuzberg Reads). All conversations, members, and events are mock data. The governance and trust layers are real design, not decoration.

---

## Suggested walkthrough order

### 1. Discover — conversations feed

**Click:** Conversations in the left sidebar under dyad Berlin.

The feed opens in map view by default. Each pin is a real person in Berlin who has written a conversation prompt and offered meeting times. The map gives you a sense of the geographic density — this is a city-scale product.

Switch to grid view (toggle top-right of the feed) to see the card layout. Each card shows:
- The person's first-person prompt (what they want to talk about)
- Their neighbourhood and next available slot

**Click any card** to open the full conversation. You'll see:
- A cover image
- The full text — written by a real community member, not marketing copy
- For some conversations: a "Going" strip showing who else has confirmed to meet

The prompt authors are real archetypes: a researcher, a photographer, a platform policy worker, a housing activist. These aren't engagement-optimised posts. They're invitations to a real conversation.

**What to say:** "The core mechanic is a written prompt + a meeting slot. You respond to the writing, then you invite someone to meet. The platform never connects you directly — there's no DM, no chat before the meeting. You meet as strangers who've read each other."

---

### 2. Events

**Click:** Events in the left sidebar.

This shows community-organiser-created events — assemblies, workshops, reading groups, working sessions. Timeline layout, date on the left, card on the right.

All events are in-person venues in Berlin, Amsterdam, and Kreuzberg. No Zoom, no virtual-only.

The "Going" and "Interested" badges show which events the logged-in user has committed to.

**What to say:** "Events are how the community gathers at scale. Conversations are 1:1. Events are the group layer — governance assemblies, skill-sharing workshops, reading groups. Organisers create them; the platform handles RSVPs and visibility."

---

### 3. Chat

**Click:** Chat in the left sidebar.

Three-column layout: channels on the left, messages in the middle, online members on the right. The channels are grouped by function: `#general`, `#governance`, `#field-notes`, `#introductions`.

The messages are mock but representative — governance discussions, event coordination, new member intros, link-sharing. The tone is what you'd see in a healthy community Slack, without the noise.

**What to say:** "Chat is the connective tissue between conversations and governance. We're building this on Matrix protocol — fully federated, fully self-hostable, interoperable with any Matrix client. Communities can run their own server if they want sovereignty over their data."

---

### 4. Members

**Click:** Members in the left sidebar.

Card grid of community members. Click any card to open a profile modal showing:
- Membership number, handle, role (steward / organiser / member)
- Tags, status, join date
- Cross-community memberships

The tab switcher at the top lets you move between communities. Private communities (🔒) show member counts but restrict identity information.

**What to say:** "Membership is numbered and legible. You know who's in the room — not just a follower count. The role system (steward / organiser / member) maps to real governance responsibilities. Stewards are elected. Organisers are delegated. This isn't cosmetic."

---

### 5. Trust & Safety

**Click:** Trust & Safety under the TRUST & SAFETY section in the left sidebar.

Three tabs:

- **Moderation log** — every action taken (by humans or the automated layer) is logged and timestamped. Members can see what decisions were made and appeal them. This is the SAFEskies design pattern applied to our context.
- **Reports** — the pending report queue with action buttons (Dismiss / Warn / Remove). Moderators see this; members see the outcome log.
- **Community standards** — five principles, and at the bottom: the three-layer moderation stack (LocalMod for automated detection, SAFEskies pattern for community-controlled decisions, Assembly for policy changes).

**What to say:** "Moderation transparency is a design principle, not a feature. Every action is logged. Every member can see what was done and why. No platform does this — they treat moderation as a liability. We treat it as accountability infrastructure."

---

### 6. Field Notes (Blog)

**Click:** Blog in the left sidebar.

The community's editorial layer — long-form posts, updates, reflections. This doubles as the newsletter. Integrated into the app shell rather than a separate tool.

---

### 7. Governance — Assembly

**Click:** Assembly under GOVERNANCE in the left sidebar.

This is where collective decisions happen. (Currently showing a placeholder — full implementation uses Decidim's GraphQL API as the governance backend.)

**What to say:** "Governance is not a checkbox. The assembly is where policy changes are proposed, discussed, and voted on. No steward can unilaterally change the rules. This is what makes it a steward-owned structure rather than just a platform that says it cares about community."

---

## Key numbers to have ready

| | |
|---|---|
| Pre-seed ask | €250,000 – €300,000 |
| Current members (Berlin alpha) | ~50 |
| Mock data communities in demo | 4 public + 2 private |
| Target: break even | Month 18 |
| Target: second city | Month 12 |
| Ownership model | Steward ownership (non-extractive, cooperative principles) |

---

## The one-sentence pitch

> dyad is the infrastructure layer for communities that want to govern themselves — starting with in-person conversation, building toward full civic participation.

---

## Questions Theodore might ask

**"Why not just use Slack/Discord?"**  
Those are products designed for engagement and growth, owned by companies with investor obligations. We're building infrastructure designed for longevity and self-governance — the community owns its data, its rules, and its future.

**"How does this make money?"**  
Membership fees paid to the community (we take a platform fee). Larger organisations (NGOs, foundations, housing cooperatives) pay for a hosted instance. We don't monetise attention or data.

**"What's the moat?"**  
The governance layer. Anyone can build a chat app. Building the trust infrastructure — transparent moderation, federated identity, participatory decision-making — and getting communities to actually use it is the hard part. The moat is the community itself.

**"Is this open source?"**  
The moderation and governance tooling we're building on (LocalMod, SAFEskies pattern, Decidim) is open source. Our platform layer will be source-available. The business model doesn't depend on lock-in.

**"What's the EU angle?"**  
The EU Tech Sovereignty Package (June 2026) mandates open-source preference for public administration procurement and funds European digital infrastructure alternatives. We're positioned as exactly that alternative — built in Europe, for European institutions and communities, with governance baked in from the start.
