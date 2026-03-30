# Roadmap

## v0.1 — Alpha Playtest (current)

**Goal:** A select group of testers can complete the full user journey — discover, respond, invite, meet, give feedback — and provide meaningful feedback on the experience.

**Operating constraint:** Must run unattended for weeks. The main developer will have limited availability. A non-technical co-founder (admin) must be able to operate the platform from an in-app admin panel. No database surgery, no curl commands.

### Feature status

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page with conversation previews | DONE | Anon visitors see real conversations, vague slots before response |
| Waitlist form | DONE | Saves to `contacts` table |
| Invite-based registration | DONE | Fixed signup RPC (migration 20260411) |
| Discover page (list + map + search) | DONE | List + map + date filter + search overlay |
| Conversation editor + publish flow | DONE | TipTap, cover image upload, slot scheduling |
| Response-first invitation flow | DONE | Vague slots before response, full reveal after |
| Author accepts invitation → meeting | DONE | |
| Meeting detail with location reveal | DONE | Maps link, calendar export |
| Feedback form + gate | DONE | 4-step state machine, adjective vocabulary, gate middleware |
| Simultaneous feedback reveal | DONE | Inline reveal on feedback page |
| In-app feedback/report button | DONE | FeedbackModal in all layout groups |
| Admin panel (waitlist, invite, feedback) | DONE | Waitlist management, user invites, feedback viewer |
| Security fixes (RLS, function grants) | DONE | 10 security migrations, column-level access, anon profile revocation |
| Progressive slot disclosure | DONE | Vague slots (day + area) before response, full after |
| Centralized copy (`copy.ts`) | DONE | 211 lines, organized by route, prep for localization |
| Mobile Playwright tests | DONE | Multi-viewport test harness (desktop + mobile), 26 E2E tests |
| Profile page with full actions | DONE | Calendar filter, search, + button, inline meeting context |
| Production email delivery | **DEFERRED v0.1.x** | Mailpit only — needs EU provider |
| Remote Supabase migrations | **DEFERRED v0.1.x** | Not yet applied to production |
| Waitlist modal on landing page | **DEFERRED v0.2** | Not blocking alpha |
| BottomSheet non-blocking | **DEFERRED v0.2** | Needs proper solution |
| Invitation decline button | **DEFERRED v0.2** | Authors can only accept or ignore |
| Email notifications | **DEFERRED v0.2** | Invitation received, accepted, cancelled |
| Performance optimizations | **DEFERRED v0.2** | Query parallelization in discover + detail |

**Detailed implementation plan:** `docs/plans/2026-03-28-feat-v01-release-readiness-plan.md` (archived)

### Explicit non-goals for v0.1
- Public profiles
- Open conversations for non-members
- EN/DE localization (but copy centralization prepares for it)
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
