# Design

The consolidated design reference for dyad. Three sections: why the platform is shaped the way it is, how internal vocabulary maps to user-facing copy, and the visual system to follow when changing UI.

## Why dyad is shaped this way

People come to dyad seeking safety, validation, belonging. The comfortable path to those is through affinity — finding people like you, forming cliques, retreating into shared language. This is the local minimum: it feels like connection but reproduces the sorting that isolates us in the first place.

The deeper need is for a way to be with others that cuts across the categories we have been sorted into — not "authentic connection" (a phrase emptied of meaning) but the practice of encountering someone outside your category and discovering that the ground between you is more solid than expected.

Dyad's structural choices — no interest matching, no similarity algorithms, a commons not a feed, shared questions not shared identities — are not UX preferences. They are an attempt to build social infrastructure that cross-links rather than clusters. The conversation prompt is the emulsifier: it gives different people a surface to meet across without dissolving difference. Every feature that makes the platform "easier" by reducing friction through sorting accelerates the very isolation the platform exists to address. The goal is encounter, not efficiency.

Dyad is an enabler of in-person community, not a replacement for it. Every design decision should be evaluated against that: does it get people into the same room, or does it give them a reason to stay on their screens?

## Structural commitments

These are encoded in the data model, the API surface, and the UI. Changing them changes what the platform is.

### Coordination, not communication

The platform helps members find a time and place to meet in person. It does not mediate contact between them before the meeting. The encounter is where the conversation happens; the app is the coordination layer that gets two people to the same place at the same time.

- The meeting is analogue. Members agree on a time and place through the app, then they show up. Like the old days.
- No contact details exchanged through the platform. Free-text fields may need stripping enforcement.
- Responses are allowed without inviting. A member can leave one response on a conversation without sending an invitation. This is a single message to the author, not a messaging channel. Responses are editable (with an "edited" indicator). One response per member per conversation.
- No threading, no replies, no back-and-forth. A response is a one-way message. If the responder later decides to invite, the invitation flow picks up from there.
- No-show is a valid outcome. Reported in the post-meeting feedback form. No-shows trigger moderator review.
- If members meet and exchange contact info in person — great. The platform's job ends at getting them to the same place at the same time.

### Response-first invitation

A member must write a response before they can invite to meet. The response *is* the meeting context. This is enforced in the data model: invitations are tied to responses, not to bare prompt IDs.

### Calm technology

The platform follows the *calm technology* posture (Weiser & Brown 1996; Case 2015) — minimal demand on attention, app-as-surface rather than push-as-channel.

- Notifications are opt-in (email, push) and minimal by design.
- The app itself is the primary surface. Feedback prompts and meeting updates appear in-app, not as pings demanding attention.
- The feedback gate is a hard line: no access to the app at all until at least minimum feedback is submitted. The gate activates immediately when meeting start time passes (mid-session, not on next login).
- No reminder cadence. If a member never submits feedback, they remain gated. The blocking is the reminder.

### Anti-sorting

- No interest matching. No personality tests. No "people like you" recommendations.
- The discover page is a commons, not a feed.
- People become visible through their writing and their meeting feedback — not through profiles or bios.
- If "following" is ever introduced, it must not influence discover ordering. Following without anti-sorting guardrails contradicts the platform's reason for existing.

### Reputation through structure, not score

- Reputation is profile-visible, not numerical. Expressed through feedback, testimonials, and behavioural signals.
- Cancellation history, no-show history, and feedback quality contribute to what others see.
- The member controls which received feedback to display; cancellation/no-show signals may not be hideable.
- Marks are associated with the email address. Deleting an account to escape bad reputation is not viable.
- Not a blacklist. Bad behaviour reduces attractiveness, doesn't hard-block.

### Anonymity and identity

- Members should be able to protect their pseudonymity. Usernames are not given importance.
- Identity accrues through action: feedback, testimonials, showing-up history. Not through self-declaration.

### Privacy by structure: location and time

- The author sets 1–3 time slots at publish time, each with start time, duration, and location.
- Time slots use a rolling 7-day window. Without active future slots, the prompt is auto-archived.
- The exact location is private. The system generates a general area (neighbourhood-level) from the exact location. The inviter sees only the general area; exact location is revealed after acceptance.
- Confirmed time slots are hidden from non-participants (RLS-enforced).
- The inviter picks one time+place option. No negotiation. If accepted, that's the meeting.
- Time slots where a member already has an accepted meeting are hidden — no double-booking.

### Consent-free as a constraint

- Any feature that would require a GDPR / ePrivacy consent modal for visitors is foreclosed by default. The consent banner is treated as a signal of architectural drift toward third-party tracking, third-party assets, or cookie-based personalisation.
- In practice this rules out: cookie-setting analytics (Google Analytics, Mixpanel), embedded social widgets (Twitter / X, YouTube, LinkedIn), font CDNs that observe IP addresses (Google Fonts), map embeds that share request data with the host (Google Maps, Mapbox), and any third-party script that profiles visitors.
- It rules in: cookieless EU-hosted analytics (Plausible, in use), self-hosted fonts (SangBleu Sunrise, served from `/static/fonts/`), self-hosted Leaflet tiles, pointing visitors at a third-party page (Substack signup, Stripe Checkout) rather than embedding it in dyad.
- If a desired outcome can only be reached through a consent-requiring path, the choice is to find a consent-free alternative or to accept that the feature is foreclosed. The principle is structural, not aesthetic — it composes with the upact privacy port, the payment-opacity contract, and the calm-tech use shape.
- The brand signal is incidental but real: visitors do not encounter a cookie wall on `dyad.berlin`.

### Cancellation symmetry

- Both authors and inviters can cancel. Same tiers apply to both parties.
- Withdrawing an invitation before acceptance is free.
- Invitations expire 12 hours before meeting start time if unanswered.
- Account deletion releases the other party from the feedback gate. Cancellation rules apply.

### Admin visibility, stated plainly

- Admins can see everything. All conversations, invitations, feedback, profiles.
- Members should assume admins can read anything they upload. The platform does not collect private or confidential details beyond what members agree to share.
- Admins can: edit/remove conversations, suspend members, force-cancel meetings, see "share with platform" feedback, manage moderation.

### No interrupting modals

- Onboarding is not a guided tour with modals highlighting UI elements.
- Members are inducted into platform norms organically through the interface itself.
- Modals that keep a member in context are fine — for example, the waitlist form that appears when an anonymous visitor clicks a conversation. The principle: don't interrupt flow with demands for attention. Overlays that serve the member's current intent are not interruptions.

### Three states, five verbs

Conversations move through three states: **draft** (pre-publication, only the author sees it), **published** (live on the feed), **archived** (off the feed, kept). Five author actions move between them.

- **Publish** moves a draft to published. The standard first-time-live flow with slot selection.
- **Unpublish** takes a published conversation off the feed and back to draft. The author keeps working in the same editor they used to write the prompt in the first place; when ready, they Publish again. Unpublish is the affordance that lowers the cost of publishing: an author who knows they can take it back to drafts at any time is more willing to push the button.
- **Archive** takes a conversation off the feed while keeping it as a record. Archived prompts can be republished through the editor's action bar when the author wants to bring them back. Archive is the right shape when the author considers the conversation done with its current life but wants the record kept.
- **Republish** moves an archived conversation back to published through the same publish flow that handles drafts. Slots are re-chosen each time; the prompt itself can be lightly or heavily reworked in the meantime.
- **Delete** removes the conversation permanently.

Unpublish and Archive both take a conversation off the feed but answer different author intents: "I'm not done with this" vs. "I'm setting this aside." The state values they target (`draft` vs. `archived`) match the intent.

There is no "edit" verb in the state machine. Editing is what happens in the editor, on a draft. To revise a published conversation, the author Unpublishes (the prompt becomes a draft), edits, and Publishes again — same flow as the first publish. This matches the platform's posture: prompts are sloppy invitations written quickly, not polished publications, and so editing-in-place is not a thing the platform encourages. Authors who feel the urge to ship a "v2" because they noticed a typo are operating on the wrong tier of stakes.

### Inclusive language

- Avoid intellectualism signals. Phrases like "independent thinkers" or "meet through writing" create invisible barriers.
- Test copy against the question: would a nurse, a barista, a retiree feel addressed by this language?
- Curiosity, not expertise. Prompts should invite exploration, not signal that being well-read is a prerequisite.

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
| `state: archived` | **archived** / **past** | "past" is acceptable for softer language. |
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

### FloatingNav

Pill-shaped, fixed, glassmorphic. Two variants.

**Discover variant** (top): `[Map] [Calendar] [Search…] [+] [Profile]`. Search is an expanding pill (`flex: 1`, `rgba(0,0,0,0.07)` bg). `backdrop-filter: blur(12px)`. Shadow `0 4px 24px rgba(0,0,0,0.15)`. z-index 800. Max-width 360px, centred.

**Editor variant** (top): `[← Back] [• Saved] [...] [Continue]`. Continue is a dark pill (`--text-primary` bg, `--bg-canvas` text, `--radius-pill`). Saved indicator is a green dot + "Saved".

**Date filter panel**: appears below FloatingNav, same glassmorphic style, 7-day picker with round day cells.

### SlotCard

Reusable time-slot card. Full-width, `--radius-card` corners, 1px `--border-link` border, `--space-4` padding. Two-line layout:

- Line 1: hybrid date + time — "Today at 15:00" / "Tomorrow at 10:00" / "Saturday at 15:00" / "29 Mar at 15:00".
- Line 2: duration + area — monospace, `--text-xs`, muted, uppercase — "1 hour · Kreuzberg".

States: default border; selected (`border-width: 2px; border-color: var(--text-primary)`); invited (`opacity: 0.5` + "Invited" badge); tappable when `onclick` is provided. Used in conversation detail (slot selection + invitation display) and on the author's received-invitations view.

### Bottom sheets

- No backdrop — map clicks pass through to allow pin switching.
- Slides up from bottom (`fly` transition, `y: 160, duration: 480`).
- Fixed-positioned, 16px top corners on mobile, 12px all corners on desktop.
- Max-width 480px (mobile), 680px (desktop). Max-height 50–60vh, scrollable.
- Dismissed by clicking the map or tapping another pin.
- Desktop (≥ 768px): centred at bottom with 24px inset.

### Cards

**Profile conversation list** (unified): single list combining authored (published, draft, archived) and responded conversations, sorted by recency. First 3 visible, "See all N conversations →" expands with staggered fade-in (200ms, 50ms delay per item). Published-with-meeting shows an inline sub-card with a warm green tint (`rgba(61,158,90,0.06)`), partner @username, date/time, area. Drafts dimmed (`--opacity-hover-card`) with "continue editing →". Archived dimmed (`--opacity-disabled`). Empty state is a large dashed-border CTA.

**Discover feed rows**: 88×96px thumbnail with `--radius-input` corners; title (`--text-lg`, weight 500); date (`--text-sm`, muted); snippet (`--text-md`, 2-line clamp); area (uppercase monospace); @author. Divider is 1px `--border-link`.

### Buttons

| Variant | Use | Style |
|---------|-----|-------|
| `.btn-primary` | Publish, Send, Create, Invite | `--text-primary` bg, `--bg-canvas` text, `--radius-input`, padding `--space-3` `--space-6`, hover opacity 0.85 |
| `.btn-secondary` | Cancel, Unpublish, Select slot | Transparent bg, `--border-link` border, hover fills dark |
| `.btn-text` | Edit, Change cover, Add slot | `--text-muted`, underline, hover `--text-primary` |

### Inputs

`--text-base` font size; padding `--space-3`; `--border-link` border; `--radius-input` corners; transparent background. Focus: `outline: none`, border-color `--text-muted`. Placeholder colour `--text-muted`.

### Cover images

- **Placeholder (editor):** dashed border (`1.5px dashed rgba(0,0,0,0.12)`), `--radius-card` corners, centred icon + "Add a cover photo" + "Required. Click or drag an image." Warm bg (`rgba(0,0,0,0.025)`).
- **Preview (editor):** full-width, `--radius-card`, max-height 280px, `object-fit: cover`. "Change cover" overlay bottom-right.
- **Detail page:** full-width, max-height 400px, `--radius-card`.
- **Map pins:** 44×44px circular, 2px white border, subtle shadow. Cover image or dark circle with initial letter.

## UI patterns

### Guidance through placeholders

The app uses placeholder text as its primary guidance mechanism — no tutorial modals, no persistent labels, no instruction paragraphs above form fields. Grey placeholder text tells a member what to do; once they type, the instructions disappear and the interface is clean.

Examples:

- Editor title: "Title" (large, light serif).
- Editor body: "Start writing..."
- Response textarea: "Write your response — once sent, you'll see available times to meet"
- Invitation message: "Add a note (optional)"
- Search input: "Search" (large, centred)

Rules:

- Default placeholder text is short — a verb phrase, not a question or sentence.
- At key transition points in the journey, a flow-guiding placeholder may describe what happens next (one line). The placeholder *is* the guidance — there is no surrounding explainer copy.
- No labels above inputs that duplicate the placeholder meaning.
- No persistent hint text below inputs (exception: privacy notes like "Only visible to you and the author").
- Section titles are minimal or absent — the placeholder *is* the affordance.
- Use `--text-muted` at reduced opacity so placeholders feel like whispers, not instructions.

### Monospace metadata

For @usernames, dates, stat labels, slot areas, badges. Font `--font-mono`, size `--text-xs` (11px), colour `--text-muted`. Often `text-transform: uppercase` with `letter-spacing: 0.04em`.

### Glassmorphic surfaces

`--bg-glass` (`rgba(245,244,240,0.96)` / dark `rgba(10,10,10,0.96)`) is used for FloatingNav, the date filter panel, and other floating UI. Always pair with `backdrop-filter: blur(12px)`.

### Animations

- Bottom sheet: `fly` from y 160, 480ms (see *Components / Bottom sheets*).
- Hover transitions: 0.15s on backgrounds, colours, borders.
- Theme transitions: 0.2s ease on all colour properties (global).
- Map geolocation: instant jump, no animation (`animate: false`).
- RotatingHeadline: 2800ms interval, 420ms fade+slide per word.
- City dot pulse: 2.5s ease-in-out infinite, opacity 1 → 0.4 → 1.

## Style guide alignment

- **Headings** (Title Case): "My Conversations", "Available Times".
- **Buttons / actions** (lowercase): "start a conversation", "publish", "sign out".
- **Badges / labels** (Sentence case): "Draft", "Published", "Archived".

## Out of scope for this document

- Pixel-perfect measurements for one-off layouts (measure from the reference, then express in tokens).
- Dark-mode colour values beyond what is listed (defined in `src/app.css`).
- Responsive breakpoints beyond the 430px mobile threshold.
- Accessibility (WCAG compliance, focus states) — future work.
