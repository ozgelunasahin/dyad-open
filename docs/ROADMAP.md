# Roadmap

## v0.1 — Alpha Playtest (current)

**Goal:** A select group of testers can complete the full user journey — discover, respond, invite, meet, give feedback — and provide meaningful feedback on the experience.

**Operating constraint:** Must run unattended for weeks. The main developer will have limited availability. A non-technical co-founder (admin) must be able to operate the platform from an in-app admin panel. No database surgery, no curl commands.

### What works now (shipped in PRs #32-61)

- Landing page with conversation previews for anonymous visitors
- Waitlist form (`/waitlist`) that saves to `contacts` table
- Invite-based registration (`/join?token=...`) with username + password
- Discover page with list view, map view (Leaflet), search overlay, date/area filters
- Conversation editor (TipTap rich text) with cover image upload, auto-save, publish flow
- Time slot scheduling (1-3 slots per conversation, rolling 7-day window, Nominatim location search)
- Response-first invitation flow (write response → select slot → send invitation)
- Author views received invitations and can accept → meeting created
- Meeting detail page with location reveal
- Feedback form with adjective vocabulary, simultaneous reveal (backend complete)
- Feedback gate (app locked until feedback submitted)
- SvelteKit on Cloudflare Pages, Supabase backend with RLS

### Gaps to close for v0.1 (see `docs/plans/2026-03-28-feat-v01-release-readiness-plan.md`)

**Blockers (8):**
1. Fix `confirm_user_email` RPC — signup is broken
2. Enable pg_cron for meeting lifecycle transitions
3. Fix wrong column names in feedback/layout loaders
4. Wire production email delivery (EU provider)
5. Apply all migrations to remote Supabase
6. Build revealed feedback UI (frontend for simultaneous reveal)
7. Add in-app feedback/report button + table
8. Build admin panel (waitlist view, invite button, feedback view)

**Should-fix (14):** Security fixes, performance optimizations, progressive slot disclosure, centralized copy, waitlist modal, mobile tests, BottomSheet interaction, decline invitation, email notifications, design polish.

### Explicit non-goals for v0.1
- Public profiles
- Open conversations for non-members
- EN/DE localization
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
- Monitoring and alerting
- CDN for cover images (Supabase Storage + Cloudflare)

### Business
- Solidarity pricing implementation (3 tiers, same features)
- Steward ownership paperwork
- Venue partnership pilot (5-10 hand-curated Berlin venues)

---

## v0.3+ — Growth & Interoperability (future)

- Venue partnerships at scale
- Portable reputation via Verifiable Credentials (eIDAS 2.0 pathway)
- Multi-region support (beyond Berlin)
- Calendar integration (`.ics` export, Google/Outlook deep links)
- Content moderation tooling
- Group conversations (beyond dyadic)
- OIDC-compatible identity (for future DID/VC support)

---

## Sources

- User archetypes: `docs/design/user-archetypes.md`
- Design principles: `docs/design/design-principles.md`
- Sustainability model: `docs/design/sustainability-and-accessibility.md`
- v0.1 gap analysis: `docs/plans/2026-03-28-feat-v01-release-readiness-plan.md`
- v0.1 consolidation: `docs/plans/2026-03-27-docs-v01-release-consolidation-plan.md`
- User stories: `docs/stories/001-004`
