# Design

The consolidated design reference for dyad. Three sections: why the platform is shaped the way it is, how internal vocabulary maps to user-facing copy, and the visual system to follow when changing UI.

## Why dyad is shaped this way

People in Berlin who want to meet across social categories have no coordination layer for that. Every available digital tool (dating apps, Meetup, social feeds, networking apps) routes them toward affinity-based sorting, which feels like connection but reproduces the clustering that left them isolated in the first place. The crux: making stranger-meeting "easier" almost always means reducing friction through similarity matching, which accelerates the very isolation the user came in trying to address.

## Structural commitments

These are encoded in the data model, the API surface, and the UI.

### Coordination, not communication

The platform helps members find a time and place to meet in person. It does not mediate contact between them before the meeting. The encounter is where the conversation happens; the app is the coordination layer that gets two people to the same place at the same time.

- The meeting is analogue. Members agree on a time and place through the app, then they show up.
- No contact details exchanged through the platform. Free-text fields may need stripping enforcement.
- Responses are allowed without inviting. A member can leave one response on a conversation without sending an invitation. This is a single message to the author, not a messaging channel. Responses are editable (with an "edited" indicator). One response per member per conversation.
- No threading, no replies, no back-and-forth. A response is a one-way message. If the responder later decides to invite, the invitation flow picks up from there.
- A member must write a response before they can invite to meet. The response is the meeting context.
- No-show is a valid outcome. Reported in the post-meeting feedback form. No-shows trigger moderator review.
- If members meet and exchange contact info in person — great. The platform's job ends at getting them to the same place at the same time.

### Calm technology

We have tried to make the app ask very little of members' attention. Notifications and prompts appear when there's something specific to act on.

- Notifications are opt-in (email, push) and minimal by design.
- The app itself is the primary surface. Feedback prompts and meeting updates appear in-app, not as pings demanding attention.
- The feedback gate is a hard line: no access to the app at all until at least minimum feedback is submitted. The gate activates immediately when meeting start time passes (mid-session, not on next login).
- No reminder cadence. If a member never submits feedback, they remain gated. The blocking is the reminder.

### Anti-sorting

- No interest matching. No personality tests. No "people like you" recommendations.
- The discover page is a commons, not a feed.
- Members see each other through their writing and through the feedback others have left them. There are no separate profile bios.
- If "following" is ever introduced, it must not influence discover ordering.

### Reputation

- Reputation is profile-visible, not numerical. Expressed through feedback, testimonials, and behavioural signals.
- Cancellation history, no-show history, and feedback quality contribute to what others see.
- The member controls which received feedback to display; cancellation/no-show signals may not be hideable.
- Marks are associated with the email address. Deleting an account to escape bad reputation is not viable.
- The platform doesn't ban members for bad behaviour. Their reputation makes them less attractive to others, and members decide for themselves whether to engage.

### Anonymity and identity

- Members should be able to protect their pseudonymity. Usernames are not given importance.
- Identity accrues through action: feedback, testimonials, showing-up history. Not through self-declaration.

### Privacy by structure: location and time

- The author sets 1–3 time slots at publish time, each with start time, duration, and location.
- Time slots use a rolling 7-day window. A prompt with no future slots falls out of the discover feed but stays in the author's profile under Past.
- The exact location is private. The inviter sees only a general area (neighbourhood-level, derived from the exact location); the exact location is revealed after acceptance.
- Confirmed time slots are hidden from non-participants (RLS-enforced).
- The inviter picks one time+place option. No negotiation. If accepted, that's the meeting.
- Time slots where a member already has an accepted meeting are hidden — no double-booking.

### Consent-free as a constraint

- Any feature that would require a GDPR / ePrivacy consent modal for visitors is foreclosed by default. The consent banner is treated as a signal of architectural drift toward third-party tracking, third-party assets, or cookie-based personalisation.
- If a desired outcome can only be reached through a consent-requiring path, the choice is to find a consent-free alternative or to accept that the feature is foreclosed.
- Current setup: Plausible (cookieless, EU-hosted) for analytics, self-hosted SangBleu Sunrise fonts, Leaflet with OpenStreetMap tiles, Stripe Checkout instead of embedded Stripe Elements.

### Cancellation symmetry

- Both authors and inviters can cancel. Same tiers apply to both parties.
- Withdrawing an invitation before acceptance is free.
- Invitations expire 12 hours before meeting start time if unanswered.
- Account deletion releases the other party from the feedback gate. Cancellation rules apply.

### Admin visibility, stated plainly

- Admins can see everything. All conversations, invitations, feedback, profiles.
- Members should assume admins can read anything they upload. The platform does not collect private or confidential details beyond what members agree to share.

### Two states, three verbs

Conversations move through two states: **draft** (only the author sees it) and **public** (live on the feed). Three author actions move between them.

- **Publish** takes a draft public. First-time publish requires the author to pick at least one time slot. Re-publish from an unpublished draft preserves the existing slots — slot management is a continuous concern, not part of the state transition.
- **Unpublish** takes a public conversation off the feed and back to draft. Slots stay attached to the conversation. Pending invitations on those slots expire (the take-down's only side effect). Active scheduled meetings are unaffected — they live on `/meetings/[id]` and the participants are committed to them regardless of where the conversation sits.
- **Delete** removes the conversation permanently.

The author surface distinguishes two flavors of draft via UI label, derived from `published_at`:
- **Draft** — never published. The author is still writing.
- **Unpublished** — was public, now off-feed. The author took it down and may bring it back.

A published conversation whose slots have all expired remains in `state='published'`. It falls out of the discover feed (which filters on slot validity) and surfaces in the author's Profile under the Past tab. The author revives it by adding a new slot. Direct links to drafts (whether never-published or unpublished) 404 for non-authors.

## Domain language

The internal model uses precise technical terms; user-facing copy uses everyday language. Members should never encounter domain vocabulary.

| Internal (code/API/DB) | User-facing | Notes |
|------------------------|-------------|-------|
| `prompt` | **conversation** | A "prompt" is the written starting point. A "conversation" is the whole flow — writing, meeting, talking. Members see "conversation" because that is the human experience. |
| `prompt_comments` (DB) / `comment` | **response** | Writing a response is intentional engagement with the conversation, not a casual comment. The response is the gateway to the invitation. |
| `time_slot` | **time** / **available time** | "Pick a time", not "select a slot". |
| `LocationRef` | **location** / **place** | Natural language. |
| `general_area` | **neighbourhood** | The area shown to the inviter before acceptance. |
| `exact_location` | **location** / **where to meet** | Only shown after acceptance. |
| `author_id` | **you** / **the author** | No IDs surfaced. |
| `body` (TipTap JSON) | *(not named)* | Members write; they don't "create a body". |
| `state: draft` | **draft** | Passes through as-is. |
| `state: published` | **published** / **live** | "Your conversation is live on the discover feed." |
| `feedback_form` | **feedback** | "How did it go?" not "complete your feedback form". |
| `meeting`, `invitation` | same | Pass through — natural words. |
| `region` | **city** / *(implicit)* | Berlin is implicit; don't force members to choose. |

**Boundary discipline.** Map domain → user-facing at the service/component boundary. A frontend component must never display raw API field names. Error messages from the API may surface domain words ("Failed to create prompt"); catch and rephrase at the UI layer.

**URL paths use `/conversations/`**; `/api/prompts/` retains the internal name (deliberate split — the API is for code, the URL is for humans).

## Visual system

Tokens live in `src/app.css`. Use tokens, not hardcoded values. The design system is a contract: every CSS value should reference a token.

### Palette

Warm, neutral, paper-like. Low contrast. No bright colours except status indicators.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg-canvas` | `#f5f3f0` | `#000000` | Page background |
| `--text-primary` | `#1a1a1a` | `#f5f3f0` | Headings, body, buttons |
| `--text-secondary` | `#333` | `#e8e6e3` | Secondary body text |
| `--text-muted` | `#666` | `#888` | Hints, placeholders, metadata |
| `--border-link` | `rgba(0,0,0,0.25)` | `rgba(255,255,255,0.25)` | Borders, dividers |
| `--bg-control` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.05)` | Input backgrounds, hover states |
| `--bg-glass` | `rgba(245,244,240,0.96)` | `rgba(10,10,10,0.96)` | FloatingNav, floating panels |
| `--color-success` | `#3d9e5a` | — | Active dots, success messages |
| `--color-danger` | `#c00` | — | Errors, destructive actions |
| `--color-saving` | `#f59e0b` | — | Save-in-progress indicator |

### Typography

Two fonts. Serif is the primary voice; monospace is for metadata and system labels.

| Token | Value | Usage |
|-------|-------|-------|
| `--font-serif` | SangBleu Sunrise, Georgia, serif | Body, headings, buttons, inputs |
| `--font-mono` | SF Mono, Fira Code, Menlo, monospace | @usernames, dates, badges, stats, slot areas |

#### Type scale

| Token | Size | Where it appears |
|-------|------|------------------|
| `--text-xs` | 11px | Monospace badges, stat labels, slot areas, dates |
| `--text-sm` | 13px | Hints, small buttons, privacy notes |
| `--text-base` | 14px | Body text, input fields, standard buttons |
| `--text-md` | 15px | Comfortable reading (conversation body), card labels |
| `--text-lg` | 16px | Section titles, sidebar links |
| `--text-xl` | 18px | Sub-headings, profile name |
| `--text-2xl` | 24px | Page titles |
| `--text-3xl` | ~29px | Hero titles, editor placeholder |

#### Weights

300 (light) for editor placeholders. 400 (regular) for body and most UI. 500 (medium) for headings, active links, profile name, bold stats. 600 (semibold) for day picker numbers. 700 is unused.

#### Line heights

| Token | Value | Usage |
|-------|-------|-------|
| `--leading-tight` | 1.2 | Titles, headings |
| `--leading-normal` | 1.5 | UI text, buttons, lists |
| `--leading-relaxed` | 1.7 | Long-form body (conversation body, editor) |

### Spacing

4px base grid. Use tokens, not arbitrary values.

| Token | Value | Common usage |
|-------|-------|--------------|
| `--space-1` | 4px | Icon-to-label gaps |
| `--space-2` | 8px | Within components, button inline padding |
| `--space-3` | 12px | Input padding, list item gaps |
| `--space-4` | 16px | Section padding, comfortable gaps |
| `--space-5` | 20px | Button block padding |
| `--space-6` | 24px | Card padding, section separation |
| `--space-8` | 32px | Major section breaks |
| `--space-10` | 40px | Page-level spacing |

### Border radii

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-pill` | 999px | FloatingNav, search pill, username badge |
| `--radius-surface` | 20px | Container-level cards (profile, action cards) |
| `--radius-card` | 12px | Content-level cards (cover, bottom sheet, dropdowns, attention cards) |
| `--radius-input` | 6px | Inputs, buttons, selects, thumbnails |

### Interaction opacity

| Token | Value | Usage |
|-------|-------|-------|
| `--opacity-hover-card` | 0.72 | List items, cards, links on hover |
| `--opacity-hover-btn` | 0.85 | Buttons, primary actions on hover |
| `--opacity-disabled` | 0.5 | All disabled states |

### Content widths

| Token | Value | Pages |
|-------|-------|-------|
| `--content-narrow` | 560px | Meeting detail, feedback form |
| `--content-standard` | 700px | Conversation detail, profile, editor |
| `--content-wide` | 800px | Discover feed |

### Layout and breakpoints

- **430px** is the phone breakpoint (content stacking, column collapse).
- **FloatingNav** is the sole primary navigation on all viewports — fixed glassmorphic pill.
- **Main content** is centred, padded with `--space-4`, max-width varies by page.
- **Admin access** is a small icon button (admin operators only); the admin plane lives at `admin.dyad.berlin` in production.

## Components

Authoritative specs live in each component file under `src/lib/components/`. Notable patterns:

- **FloatingNav** — pill-shaped, fixed, glassmorphic. Renders different button subsets per page context via `variant` prop.
- **SlotCard** — reusable time-slot card. Single-row layout: hybrid date + time on the left, area on the right.
- **BottomSheet** — slides up from bottom on mobile, centred at bottom on desktop. Opaque (`--bg-canvas`).
- **MeetingCard** — inline sub-card for a scheduled or past meeting. Background tinted by state.
- **Button variants** (`shared.css`): `.btn-primary`, `.btn-secondary`, `.btn-text`, `.btn-danger`.
- **Inputs**: `--text-base` font, `--space-3` padding, `--border-link` border, `--radius-input` corners, transparent background.
- **Cover images**: editor placeholder + preview, conversation detail full-width, map pins as 44×44px circular fallbacks.

## UI patterns

### Guidance through placeholders

The app uses placeholder text as its primary guidance mechanism. No tutorial modals, no persistent labels, no instruction paragraphs above form fields. Once a member types, the placeholder disappears and the interface is clean. At key transition points, a flow-guiding placeholder may describe what happens next; that is the guidance, with no surrounding explainer copy. Use `--text-muted` so placeholders feel like whispers, not instructions.

### Monospace metadata

For @usernames, dates, stat labels, slot areas, badges. Font `--font-mono`, size `--text-xs` (11px), colour `--text-muted`. Often `text-transform: uppercase` with `letter-spacing: 0.04em`.

### Glassmorphic surfaces

`--bg-glass` (`rgba(245,244,240,0.96)` / dark `rgba(10,10,10,0.96)`) is used for FloatingNav, the date filter panel, and other floating UI. Always pair with `backdrop-filter: blur(12px)`.

### Animations

Hover transitions are quick (~150ms); theme transitions are slower (~400ms with an eased curve). The bottom sheet flies up from y:160 over ~480ms. Specific durations live in `--duration-*` tokens in `src/app.css`; refer to those when adding new animations rather than hardcoding values.

### Modals

The first-arrival onboarding modal is a 4-step intro on the discover page. Members can skip at any step. After that, members find their way through the interface itself. Other modals are fine when they serve the member's current task, like the waitlist form that appears when a visitor clicks a conversation. The line is whether the overlay helps with what the member is doing or interrupts it.

### Inclusive language

Avoid intellectualism signals like "independent thinkers" or "meet through writing". These address a specific kind of reader and can feel like exclusion to others. Test copy against the question: would a nurse, a barista, a retiree feel addressed? Prompts should invite exploration; they shouldn't signal that being well-read is a prerequisite.

## Style guide alignment

- **Headings** (Title Case): "My Conversations", "Available Times".
- **Buttons / actions** (lowercase): "start a conversation", "publish", "sign out".
- **Badges / labels** (Sentence case): "Draft", "Published", "Archived".

## Out of scope for this document

- Pixel-perfect measurements for one-off layouts (measure from the reference, then express in tokens).
- Dark-mode colour values beyond what is listed (defined in `src/app.css`).
- Responsive breakpoints beyond the 430px mobile threshold.
- Accessibility (WCAG compliance, focus states) — future work.
