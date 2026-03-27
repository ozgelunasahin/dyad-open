# Design System

Visual language and UI patterns extracted from the design reference screenshots and `origin/feat/v0.1-design-work` branch code. This is the source of truth for how things should look.

## Palette

Warm, neutral, paper-like. Low contrast. No bright colours except status indicators.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg-canvas` | `#f5f3f0` | `#000000` | Page background |
| `--text-primary` | `#1a1a1a` | `#f5f3f0` | Headings, body, buttons |
| `--text-secondary` | `#333` | `#e8e6e3` | Secondary body text |
| `--text-muted` | `#666` | `#888` | Hints, placeholders, metadata |
| `--border-link` | `rgba(0,0,0,0.25)` | `rgba(255,255,255,0.25)` | Borders, dividers |
| `--bg-control` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.05)` | Input backgrounds, hover states |
| `--color-success` | `#3d9e5a` | — | Active dots, success messages |
| `--color-danger` | `#c00` | — | Errors, destructive actions |
| `--color-saving` | `#f59e0b` | — | Save-in-progress indicator |

## Typography

Two fonts. Serif is the primary voice, monospace is for metadata and system labels.

| Token | Value | Usage |
|-------|-------|-------|
| `--font-serif` | SangBleu Sunrise, Georgia, serif | Everything: body, headings, buttons, inputs |
| `--font-mono` | SF Mono, Fira Code, Menlo, monospace | @usernames, dates, badges, stats, slot areas |

### Type Scale

Derived from what the design reference actually uses. 8 levels.

| Token | Size | Where it appears |
|-------|------|------------------|
| `--text-xs` | 11px | Monospace badges, stat labels (ACTIVE, MEETINGS), slot areas, dates |
| `--text-sm` | 13px | Hints, small buttons, privacy notes, secondary actions |
| `--text-base` | 14px | Body text, input fields, standard buttons, slot info |
| `--text-md` | 15px | Comfortable reading (prompt body), card labels, list items |
| `--text-lg` | 16px | Section titles ("Pick a time", "Meetings"), sidebar links |
| `--text-xl` | 18px | Sub-headings, profile name, view titles |
| `--text-2xl` | 24px | Page titles ("Meeting details", "Start a conversation") |
| `--text-3xl` | ~29px | Hero titles (prompt detail title, editor title placeholder) |

### Weights

- **300 (Light)**: Editor title placeholder
- **400 (Regular)**: Body text, most UI
- **500 (Medium)**: Headings, active sidebar links, profile name, bold stats
- **600 (Semibold)**: Day picker numbers
- **700 (Bold)**: Not used in the design reference

### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `--leading-tight` | 1.2 | Titles, headings |
| `--leading-normal` | 1.5 | UI text, buttons, lists |
| `--leading-relaxed` | 1.7 | Long-form body text (prompt body, editor) |

## Spacing

4px base grid. Use tokens, not arbitrary values.

| Token | Value | Common usage |
|-------|-------|-------------|
| `--space-1` | 4px | Icon-to-label gaps, tight inline spacing |
| `--space-2` | 8px | Within components, small gaps, button inline padding |
| `--space-3` | 12px | Input padding, list item gaps, card internal spacing |
| `--space-4` | 16px | Section padding, comfortable gaps |
| `--space-5` | 20px | Button block padding, between related elements |
| `--space-6` | 24px | Card padding, section separation |
| `--space-8` | 32px | Major section breaks, page title bottom margin |
| `--space-10` | 40px | Page-level spacing, body-to-next-section |

## Border Radii

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-pill` | 999px | FloatingNav, search pill, username badge, Continue button |
| `--radius-card` | 12px | Profile card, action cards, cover preview, bottom sheet, dropdown |
| `--radius-input` | 6px | Inputs, buttons, selects, thumbnails, location dropdown |

## Layout

### Desktop (> 430px)
- **Sidebar**: 180px wide, sticky, full height. Logo top, nav links, @username + sign out at bottom.
- **Main content**: flex: 1, padding: 2rem, centered column, max-width varies by page (700px for content pages, 800px for discover).
- **Sidebar divider**: 1px solid `--border-link`

### Mobile (<= 430px)
- **Sidebar**: hidden entirely
- **FloatingNav**: fixed pill at top or bottom, replaces sidebar navigation
- **Main content**: padding: 1rem

### Editor
- **No sidebar**: `(editor)` layout group, just centered content with padding
- **FloatingNav at top**: editor variant with ← Back, • Saved, Continue

## Components

### FloatingNav

Pill-shaped, fixed, glassmorphic. Two variants.

**Discover variant** (position: top):
`[Map] [Calendar] [Q Search...] [+] [Profile]`
- Search is an expanding pill (`flex: 1`, `rgba(0,0,0,0.07)` background)
- Background: `rgba(245, 244, 240, 0.96)` with `backdrop-filter: blur(12px)`
- Shadow: `0 4px 24px rgba(0, 0, 0, 0.15)`
- z-index: 800
- Max-width: 360px, centered

**Editor variant** (position: top):
`[← Back] [• Saved] [...spacer...] [Continue]`
- Continue is a dark pill button (`--text-primary` bg, `--bg-canvas` text, `--radius-pill`)
- Saved indicator: green dot + "Saved" text

**Date filter panel**: appears below FloatingNav, same glassmorphic style, 7-day picker with round day cells.

### Cards

**Profile action cards** (2x2 grid):
- `--radius-card` corners, 1px `--border-link` border
- Stacked photo thumbnails (52x60px, rotated ±3-5deg, 2px white border, subtle shadow)
- Label below thumbnails
- Active dot (green, 8px, top-right) for active conversations
- Count badge (monospace, dark bg, white text, top-right) for invitations

**Conversation list rows** (discover feed):
- 88x96px thumbnail, `--radius-input` corners
- Title (--text-lg, weight 500), date (--text-sm, muted), snippet (--text-md, 2-line clamp), area (uppercase monospace), @author
- Divider: 1px `--border-link`

### Bottom Sheets

- Fixed backdrop with semi-transparent black (`rgba(0,0,0,0.3)`)
- Sheet slides up from bottom (`fly` transition, y: 200, 280ms)
- `--radius-card` top corners (mobile), full `--radius-card` (desktop centered)
- Max-width: 480px, max-height: 85vh, scrollable
- Close button top-right (×)
- Desktop (>= 768px): centered modal instead of bottom-anchored

### Buttons

**Primary** (`.btn-primary`): Dark background, light text. Used for: Publish, Send, Create, Invite to meet.
- `--text-primary` bg, `--bg-canvas` text
- `--radius-input` corners
- padding: `--space-3` `--space-6`
- `:hover` opacity: 0.85, `:disabled` opacity: 0.5

**Secondary** (`.btn-secondary`): Outlined. Used for: Cancel, Unpublish, Select slot.
- Transparent bg, `--border-link` border
- `:hover` fills dark

**Text** (`.btn-text`): Underlined link. Used for: Edit, Change cover, Add slot.
- `--text-muted` color, underline
- `:hover` `--text-primary`

### Back Navigation

Always a text link: "← Back". Explicit destination, never `history.back()`.

| Page | Destination |
|------|------------|
| Conversation detail | /discover |
| Meeting detail | /profile |
| Editor | /prompts/[id] (or history) |
| Profile sub-views | Profile overview (onclick) |
| Legal pages | / |

Style: `--text-md`, `--text-muted`, no decoration, `--space-4` bottom margin.

### Cover Images

**Placeholder** (editor): Dashed border (`1.5px dashed rgba(0,0,0,0.12)`), `--radius-card` corners, centered icon + "Add a cover photo" + "Required. Click or drag an image." Warm background (`rgba(0,0,0,0.025)`).

**Preview** (editor): Full-width, `--radius-card` corners, max-height 280px, object-fit: cover. "Change cover" overlay bottom-right (dark semi-transparent pill).

**Detail page**: Full-width, max-height 400px, `--radius-card` corners.

**Map pins**: 44x44px circular (`border-radius: 50%`), 2px white border, subtle shadow. Cover image or dark circle with initial letter.

### Inputs

- `--text-base` font size
- padding: `--space-3`
- `--border-link` border, `--radius-input` corners
- Transparent background
- Focus: `outline: none`, border-color: `--text-muted`
- Placeholder: `--text-muted` color

### Monospace Metadata

Used for: @usernames, dates, stat labels, slot areas, badges.

- Font: `--font-mono`
- Size: `--text-xs` (11px)
- Color: `--text-muted`
- Often `text-transform: uppercase`, `letter-spacing: 0.04em`

## Landing Page

Split-screen layout for anonymous visitors.

**Desktop**: CSS grid `1fr 1fr`, full viewport height, no scroll on outer container.
- **Left column**: fixed hero. Logo + "log in" at top. Hero content pinned to bottom via `margin-top: auto`. Contains: RotatingHeadline, tagline with left border, city row (pulsing green dot + "BERLIN" monospace), "join waitlist →" button. Footer: theme toggle, legal links.
- **Right column**: scrollable list of ConversationCard components from published prompts.

**Mobile** (≤430px): single column, hero at top, cards below, everything scrollable.

### RotatingHeadline

Cycles through `['writers', 'artists', 'researchers', 'people with questions', 'you']` with "in conversation" on a new line.
- Interval: 2800ms between words
- Transition: 420ms fade + translateY (6px up on exit, 6px down on enter)
- Font: `clamp(3.2rem, 5.5vw, 6rem)`, normal weight, line-height 0.92
- Mobile: `font-size: 11vw`

### ConversationCard

Used on landing page right column. Shows:
- Cover image thumbnail (88×96px, `--radius-input` corners) or grey placeholder
- Neighbourhood (monospace, uppercase, `--text-xs`)
- Date (monospace, `--text-xs`)
- Title (serif, `--text-lg`, weight 500)
- Body excerpt (3-line clamp, `--text-md`)

### City Dot

Pulsing green dot next to city name:
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
animation: pulse 2.5s ease-in-out infinite;
```

## Search Overlay

Full-screen overlay triggered from FloatingNav search pill. Client-side text matching.

- Full viewport, `--bg-canvas` background, z-index 900, fade transition (180ms)
- Large centered input: `clamp(2rem, 10vw, 3.5rem)`, weight 300, centered, transparent
- Before search: suggestion chips (pill-shaped, `rgba(0,0,0,0.06)` bg, `--radius-pill`)
- After search: result rows with 52x52 cover thumb, title (weight 500), snippet (2-line clamp)
- Escape closes, Enter submits
- Body scroll locked while open

## Conversation Detail Page

From `ref-conversation-detail-mobile.jpg`:
- Full-width cover image at top (edge-to-edge on mobile)
- Below cover: `@author` (monospace, muted) + date (serif, muted) on same line
- Title: large serif (`--text-3xl`)
- Body: serif, `--text-md`, `--leading-relaxed`
- Bottom action bar: bookmark icon, response count, "invite to meet" button, share icon

## Map View

From `ref-map-mobile.jpg`:
- Full-screen, no zoom controls
- Dark circular pins (44px) — cover image or initial letter
- FloatingNav at bottom with full button set including Search pill
- Pins are offset from true location (privacy fuzz)

## Animations

- **Bottom sheet**: `fly` from y: 200, 280ms duration
- **Mobile menu panel**: `fly` from x: 300, 250ms (removed — sidebar only now)
- **Hover transitions**: 0.15s on backgrounds, colors, borders
- **Theme transitions**: 0.2s ease on all color properties (global)
- **Map geolocation**: instant jump, no animation (`animate: false`)
- **RotatingHeadline**: 2800ms interval, 420ms fade+slide per word
- **City dot pulse**: 2.5s ease-in-out infinite opacity 1→0.4→1

## What This Document Does NOT Cover

- Exact pixel measurements for one-off layouts (measure from screenshots)
- Dark mode colour values (defined in app.css, not tested against design ref)
- Responsive breakpoints beyond the 430px mobile threshold
- Accessibility (WCAG compliance, focus states) — future work
