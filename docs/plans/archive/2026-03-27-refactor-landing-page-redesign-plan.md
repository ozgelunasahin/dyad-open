---
title: "refactor: Landing page redesign — split layout + rotating headline"
type: refactor
status: active
date: 2026-03-27
---

# Landing Page Redesign — Split Layout + Rotating Headline

Rewrite the landing page to match the design reference branch (`origin/feat/v0.1-design-work`). Split-screen layout with animated headline and conversation cards.

## Decision: Login/Join Modals vs Routes

The design branch puts login and join forms in modal overlays on the landing page. Our current app uses separate `/login` and `/join` routes with their own pages.

**Decision: Keep existing routes for v0.1.** The modals require reimplementing Supabase auth client-side on the landing page, handling redirect flows from within a modal, and managing focus traps. The existing routes work. Modals are a polish item for later — the visual impact of the landing page redesign is in the layout and animation, not where the login form lives. The "log in" link and "join waitlist" button will navigate to the existing routes.

## Changes

### 1. RotatingHeadline Component

`src/lib/components/RotatingHeadline.svelte` — already written (stashed).

- [ ] Unstash and commit
- Words cycle: `writers → artists → researchers → people with questions → you`
- Each word fades out (translateY -6px, 420ms), next fades in (translateY +6px → 0)
- Interval: 2800ms
- Full headline: `{word}\n in conversation`
- Font: `clamp(3.2rem, 5.5vw, 6rem)`, normal weight, line-height 0.92

### 2. ConversationCard Component

`src/lib/components/ConversationCard.svelte` — new.

- [ ] Cover image thumbnail (or placeholder), rounded corners
- [ ] Neighbourhood label (monospace, uppercase, muted)
- [ ] Date (formatted: "Wednesday, March 18 at 7:00 PM")
- [ ] Title (serif, ~1rem, weight 500)
- [ ] Body excerpt (plain text stripped from HTML, 3-line clamp)
- [ ] Click navigates to `/login` (anonymous users can't view detail)
- [ ] Accepts a `PromptSummary` prop — reuses existing type, no new data model

### 3. Landing Page Rewrite

`src/routes/+page.svelte` — major rewrite.

**Desktop layout** (from design branch):
- [ ] CSS grid: `grid-template-columns: 1fr 1fr`, `height: 100vh`, `overflow: hidden`
- [ ] **Left column**: fixed, full height, border-right
  - Top: logo (self-hosted `/images/logo.png`) left, "log in" link right (monospace, `--text-xs`, uppercase)
  - Bottom (pinned via `margin-top: auto`): RotatingHeadline, tagline ("cultivating a culture of conversation" with 2px left border), city row (pulsing green dot + "BERLIN" monospace), "join waitlist →" button (`btn-primary`)
  - Footer: theme toggle, legal links (privacy policy | legal notice)
- [ ] **Right column**: scrollable, conversation cards from published prompts
  - Uses data already loaded by `+page.server.ts` via `getPublishedPrompts`

**Mobile layout** (≤430px):
- [ ] Single column, no grid
- [ ] Hero at top, cards below, scrollable

**What stays from current page**: theme toggle, legal links, `+page.server.ts` data loading.
**What gets removed**: the current hero text ("What would you talk about with a stranger?"), the current card layout, inline waitlist form.

### 4. Design System Update

`docs/design/design-system.md` — add:

- [ ] Landing page split-screen layout rules
- [ ] RotatingHeadline animation spec (timing, easing)
- [ ] ConversationCard component pattern
- [ ] City row with pulsing dot (keyframes)

## Files Changed

| File | Change |
|------|--------|
| `src/lib/components/RotatingHeadline.svelte` | **New** (unstash) |
| `src/lib/components/ConversationCard.svelte` | **New** |
| `src/routes/+page.svelte` | Rewrite — split layout, RotatingHeadline, cards |
| `docs/design/design-system.md` | Add landing page patterns |

## What This PR Does NOT Change

- `/login` and `/join` routes — kept as-is
- `/waitlist` route — kept as-is
- `+page.server.ts` — already loads published prompts
- FloatingNav — not shown on landing page (anonymous, no auth)

## Acceptance Criteria

- [ ] Rotating headline animates through 5 words
- [ ] Split-screen on desktop: hero left, cards right
- [ ] Single column on mobile
- [ ] Conversation cards show cover, neighbourhood, date, title, excerpt
- [ ] "log in" navigates to `/login`
- [ ] "join waitlist" navigates to `/waitlist`
- [ ] Pulsing green dot next to "BERLIN"
- [ ] Self-hosted logo, no external URLs
- [ ] Design system doc updated
- [ ] Build passes, tests pass

## Sources

- Design branch landing page: `git show origin/feat/v0.1-design-work:src/routes/+page.svelte`
- RotatingHeadline: `git show origin/feat/v0.1-design-work:src/lib/components/RotatingConversationHeadline.svelte`
- ConversationCard: `git show origin/feat/v0.1-design-work:src/lib/components/ConversationCard.svelte`
- Design system: `docs/design/design-system.md`
