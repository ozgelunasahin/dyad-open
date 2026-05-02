# Changelog

## v0.1.0 — 2026-03-30

Alpha release for invited testers. Built in 6 days across 79 PRs.

### Core Flow

The complete conversation lifecycle works end-to-end: discover conversations on a map or list, write a response, select a time slot to invite the author to meet in person, accept invitations, attend the meeting, and give feedback. Both participants must submit feedback before either can see the other's — simultaneous reveal.

- **Discover** — list view with search + map view with Leaflet, fuzzed location pins, distance-sorted BottomSheet previews
- **Conversations** — TipTap rich text editor, cover image upload, 7-day slot scheduling with Nominatim location search, publish/unpublish/archive state machine
- **Respond + Invite** — response-first flow (write before you can invite), inline slot selection with SlotCard, optional message
- **Meetings** — scheduled from accepted invitations, location revealed only to participants, symmetric cancellation
- **Feedback** — gated (app locked until feedback submitted), adjective vocabulary tags, free text, simultaneous reveal

### Infrastructure

- **SvelteKit** with Svelte 5 runes, deployed to Cloudflare Pages
- **Supabase** — auth, Postgres with RLS, storage for cover images
- **Service layer** — TypeScript interfaces with Supabase implementations, factory pattern for test portability
- **Sovereignty** — self-hosted Leaflet tiles/CSS, Nominatim via server proxy, Mailpit for local dev email, no US cloud dependencies in critical path

### Security

- HTML escaping in email templates (`escapeHtml` utility)
- TimeSlot input validation (date, duration, location bounds)
- Cover image URL allowlisting (Supabase storage only)
- Password policy (8-128 characters)
- Column-level access control on `exact_location` (SECURITY DEFINER functions)
- RLS policies for two-party visibility (invitations, feedback)
- Feedback gate middleware with fail-open design
- Route redirect: `/prompts/*` → `/conversations/*` (302)

### Design System

- CSS custom properties: spacing (4px grid), type scale, font stacks, radii, colours
- Global form element reset (buttons, inputs inherit font)
- Shared CSS classes: `.btn-primary`, `.btn-secondary`, `.btn-text`, `.back-link`, `.badge-*`
- Components: FloatingNav (discover + editor variants), SlotCard, BottomSheet, SearchOverlay, RotatingHeadline, ConversationCard, PublishSheet, PromptEditor

### Testing

- Playwright E2E: auth setup (sophie + tom), smoke tests (7), core flow test (respond → invite → accept)
- Integration tests: prompt lifecycle, feedback lifecycle
- pgTAP: RLS policy tests

### Documentation

- 24 solution documents across architecture, integration, security, UX patterns, process
- Design system spec, design principles, domain language mapping
- 31 pending todos triaged for v0.2

### Known Limitations (v0.2 backlog)

- Map BottomSheet blocks map interaction (#086)
- No fuzz circles on map (#087)
- Invitation flow uses raw form elements on some paths (#089 partially addressed)
- No real-time notifications — check when you open the app (by design: calm technology)
- No conversation editing after publish (edit link exists from profile but not from detail)
- Own conversations hidden from discover feed
- No CI pipeline
