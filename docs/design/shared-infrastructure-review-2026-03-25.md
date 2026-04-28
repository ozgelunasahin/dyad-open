---
title: Shared Infrastructure Review (2026-03-25)
date: 2026-03-25
status: current
context: After Steps 1-6 backend implementation, before frontend work
---

# Shared Infrastructure Review

Assessment of the current codebase against `docs/design/shared-infrastructure-opportunities.md` and Rebuild framework principles. Conducted after Steps 1-6 of the backend implementation sequence.

## Scorecard

| Category | Rating | Provider | Abstraction | Extraction Ready? |
|---|---|---|---|---|
| Location | GREEN | Nominatim (OSM) | Functions (no interface) | Yes — 3 small changes |
| Domain model | GREEN | None (pure TS) | N/A | Yes — immediately |
| Analytics | GREEN | None | N/A | Greenfield |
| Auth | YELLOW | Supabase GoTrue | None | No — 27 SQL refs + 6 app files |
| Database | YELLOW | Supabase PostgREST | 7 service interfaces (44% coverage) | Partially — new code yes, legacy no |
| Email | YELLOW | Resend (US) | None | No — 2 files, wrong provider |
| Hosting | YELLOW | Cloudflare Pages | SvelteKit adapter | Yes — 1 file swap |
| Storage | RED | Supabase Storage | None | No — needs interface |

## Sovereignty Violations (Fix Before Production)

### 1. Supabase region — CRITICAL
All user data (auth, profiles, prompts, meetings, feedback) flows through the hosted Supabase instance. **Verify the region is EU (Frankfurt).** If US, migrate to EU or self-host on Hetzner.

_Status (2026-04-18): resolved. Confirmed EU (Ireland) via the Supabase dashboard. Note: Ireland is EU-member-state hosting but still under a US-parent managed service — see `docs/solutions/architecture/sovereignty-lessons-learned.md` for the sovereignty-spectrum framing._

### 2. Resend email — HIGH
Email delivery via Resend (US company) exposes PII (email addresses, names, invite tokens). Replace with:
- Mailjet (EU company, EU hosting)
- Self-hosted Postal/Mailtrain
- 2 files affected: `src/routes/api/contact/+server.ts`, `src/routes/api/invites/+server.ts`

### 3. unpkg CDN for Leaflet — MEDIUM
`src/lib/components/MapView.svelte` loads Leaflet CSS/icons from `unpkg.com` (Cloudflare US). Self-host the 4 files in `static/leaflet/`.

_Status (2026-04-18): resolved. CSS served from `/leaflet/leaflet.css`; icons resolved via `L.Icon.Default.prototype.options.imagePath = '/leaflet/'`. All six asset files present in `static/leaflet/`. No `unpkg.com` or `cdnjs` references remain in `MapView.svelte`._

### 4. Hardcoded Supabase URLs — MEDIUM
17 files contain `iwdjpuyuznzukhowxjhk.supabase.co` URLs for static assets (logos, images). Extract to environment variable.

## GDPR Compliance Gaps

### 5. No data export (Art. 20 DSGVO) — HIGH
No mechanism for users to download their data. Need `/api/account/export` producing JSON/ZIP.

### 6. No account deletion (Art. 17 DSGVO) — HIGH
Already tracked in Step 7 plan. Needs soft-delete with cascade: cancel meetings, release feedback gates, mark email for reputation.

## What Extracted Cleanly

### Location service (GREEN — Rebuild extractable)
`src/lib/services/location.ts` — 162 LOC, zero vendor dependencies, pure functions. Only imports `LocationRef` from domain types. Three changes needed for standalone package:
1. Inline the `LocationRef` type (5 fields)
2. Inject rate limiter as dependency
3. Make region bounds + user agent configurable

**Rebuild contribution**: This is novel shared infrastructure — a self-hostable location service with privacy-preserving general area derivation (exact → neighbourhood). No equivalent exists in the Rebuild ecosystem.

### Domain model (GREEN — Rebuild extractable)
`src/lib/domain/` — 323 production LOC + 541 test LOC. Zero infrastructure imports. Only external type dependency: `JSONContent` from `@tiptap/core` (type-only, replaceable with structural type). Includes:
- Prompt state machine (draft → published → archived)
- Time slot derivation (available/closing/expired/booked)
- Engagement guards (canComment, canInvite, canCancel, canAccept)
- Meeting guards (canCancel, deriveCancellationTier)
- Feedback guards (canSubmit, isGated, isRevealed)

**Rebuild contribution**: Demonstrates portable business logic with testable state machines — "open layers, keep experience" principle.

### Service interface pattern (YELLOW — foundational for portability)
7 TypeScript interfaces with Supabase implementations. Test factory (`tests/helpers/db.ts`) is the single swap point. New code (Steps 1-6) consistently follows this pattern. Legacy canvas code (22 direct calls in 11 files) does not.

## What's Coupled

### Auth — 27 `auth.uid()` references across 5 migration files
All RLS policies and SECURITY DEFINER functions reference `auth.uid()`. Good choice: uses `auth.uid() IS NOT NULL` (not `auth.role()`) which is more portable. OIDC migration would require a custom `auth.uid()` replacement function backed by `current_setting()`.

### Storage — zero abstraction
Single upload endpoint (`src/routes/api/upload/+server.ts`, 46 LOC) calls `supabase.storage` directly. Need a `StorageService` interface.

### Email — wrong provider, no abstraction
Resend is US-hosted. Inline SDK usage in 2 files with HTML templates as string literals. Need `EmailService` interface + EU provider.

## Architecture Readiness for Analytics/PostHog

**Event emission points exist** in the SECURITY DEFINER functions (domain events from the DDD plan map directly):

| Domain Event | SQL Function | PostHog Event |
|---|---|---|
| PromptPublished | `accept_invitation` (creates meeting) | `meeting_created` |
| InvitationCreated | (service layer, no trigger yet) | `invitation_sent` |
| MeetingCancelled | `cancel_meeting` | `meeting_cancelled` with tier |
| FeedbackSubmitted | `submit_feedback` | `feedback_submitted` |
| FeedbackRevealed | `submit_feedback` (lock path) | `feedback_revealed` |

**Frontend events** (page views, session timing, funnel tracking) would use PostHog's JS SDK. The SvelteKit layout could emit route-change events.

**Requirements for PostHog**:
- Self-hosted on EU infrastructure (Hetzner)
- Cookie consent mechanism (GDPR Art. 6(1)(a))
- IP anonymization enabled
- Session recording opt-in only
- PostHog JS self-hosted (not from CDN)

## Rebuild Alignment Assessment

### Principles upheld
- **Sovereignty by default**: Nominatim, OSM tiles, no Google/AWS dependencies in new code
- **Intentional design**: Feedback gate, single-shot comments, no dark patterns
- **Open layers, keep experience**: Service interfaces are portable; product logic (gate, invite flow) stays proprietary
- **Portable identity readiness**: `auth.uid() IS NOT NULL` in RLS is more OIDC-compatible than role-based checks

### Principles partially upheld
- **Self-hostable**: Location and domain are extractable; auth/storage/email are not yet
- **EU infrastructure**: Nominatim/Photon are EU; Supabase/Resend/Cloudflare are US or US-controlled

### Actions needed for full Rebuild alignment
1. Verify/migrate Supabase to EU
2. Replace Resend with EU email
3. Self-host static assets (Leaflet, logos)
4. Add adapter-node as hosting alternative
5. Create storage abstraction
6. Build GDPR export + deletion

## Recommended Priority for v0.1-rc

1. **Verify Supabase region** (5 min, blocks everything)
2. **Self-host Leaflet assets** (30 min, easy win)
3. **Extract hardcoded URLs to env** (1 hour)
4. **Add adapter-node** (30 min, enables EU hosting)
5. **Replace Resend** (2 hours, 2 files)
6. **GDPR export endpoint** (half day)
7. **Storage abstraction** (2 hours)
8. **Gate query caching** (1 hour)
9. **Wire GateService into hooks.server.ts** or delete dead code (15 min)

## Sources

- `docs/design/shared-infrastructure-opportunities.md` — original vision
- `docs/solutions/architecture/service-layer-and-test-portability-patterns.md` — documented patterns
- `docs/solutions/security-issues/column-level-access-and-security-definer-patterns.md` — security patterns
- `~/rebuild/` — Rebuild framework context and principles
