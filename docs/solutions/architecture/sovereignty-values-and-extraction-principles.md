---
title: Sovereignty, values alignment, and extraction principles
category: architecture
tags: [sovereignty, rebuild, values, extraction, gdpr, eu-infrastructure]
components: [docs/design, src/lib/server/email.ts, static/]
date: 2026-03-25
prs: [37]
---

# Sovereignty, Values Alignment, and Extraction Principles

## Context

After completing Steps 1-6 of the backend implementation, we conducted a shared infrastructure review against `docs/design/shared-infrastructure-opportunities.md` and the Rebuild framework principles. This surfaced sovereignty violations, GDPR gaps, and important decisions about what to extract vs what to keep internal.

## Sovereignty Remediation Decisions

### What we fixed (PR #37)

1. **Self-hosted Leaflet assets** — CSS + marker icons moved from unpkg (US CDN) to `static/leaflet/`. Eliminates user IP leaks on map views.
2. **Self-hosted images** — Logo, auth backgrounds moved from Supabase Storage to `static/images/`. No more hardcoded external URLs.
3. **Replaced Resend (US) with nodemailer SMTP** — `src/lib/server/email.ts` utility. Local dev uses Mailpit (port 54325, captured at :54324). Production uses any EU SMTP provider.
4. **Extracted all 17 hardcoded Supabase project URLs** — replaced with local paths or `PUBLIC_SUPABASE_URL` env var.

### What still needs fixing

- **Supabase region**: Must be EU (Frankfurt). No real user data yet — clean migration window.
- **GDPR data export**: No mechanism exists for Art. 20 (data portability). Need `/api/account/export`.
- **Account deletion**: No mechanism for Art. 17 (right to erasure). Tracked in Step 7.
- **Storage abstraction**: Upload endpoint has zero abstraction (`supabase.storage` directly).
- **Hosting flexibility**: `adapter-cloudflare` only. Need `adapter-node` option for EU hosting.

### Scorecard (from review)

| Category | Rating | Notes |
|---|---|---|
| Location | GREEN | Nominatim, zero vendor deps |
| Domain model | GREEN | Pure TS, no infra imports |
| Analytics | GREEN | Greenfield — nothing exists |
| Auth | YELLOW | 27 `auth.uid()` in SQL, 6 app files |
| Database | YELLOW | 44% behind service interfaces |
| Email | GREEN (after fix) | nodemailer SMTP, EU-provider ready |
| Hosting | YELLOW | Cloudflare adapter, trivial swap |
| Storage | RED | No abstraction |

## Rebuild Extraction Principles

### Don't extract prematurely

A Nominatim wrapper and TypeScript domain types are technically portable but not novel enough to attract contributors or justify the maintenance overhead of a separate package.

**Criteria for extraction**: Would other Rebuild builders actually use this? Would they contribute? Is it novel enough?

### Watch for extraction opportunities as they mature

| Pattern | Novelty | Current State | Extract When |
|---|---|---|---|
| Privacy-preserving location (exact → general area → conditional reveal) | High | Works but not generalised | The pattern proves useful across 2+ contexts |
| Regional verification / presence proof | Very high | Not yet built | The approach is validated with real users |
| Feedback gate / accountability middleware | Medium | Works, dyad-specific UX | Generalises beyond dyad's specific rules |
| Reputation without scores (adjective vocabulary + signals) | Medium | Schema exists, no display yet | The model proves effective in practice |

### The "open layers, keep experience" principle

From Rebuild: infrastructure can be shared and open-sourced; product differentiation remains proprietary. For dyad, this means:
- **Share**: location service patterns, scheduling primitives, data export tooling
- **Keep**: feedback gate UX, single-shot comment model, invitation mechanics, discover page matching

## Values Alignment

### Diversity and inclusion

The platform's core value is supporting diverse, interconnected communities in cities. This requires active attention to language and design:

- **Avoid intellectualism signals**: Language like "independent thinkers" or "meet through writing" creates invisible barriers. Not everyone identifies as a "thinker" — but everyone can benefit from genuine conversation.
- **Test copy against the question**: Would a nurse, a barista, a retiree feel addressed by this language?
- **The platform is for people who want connection**, not for people who want to be seen as intellectual.

### Healthy brain and tracking

We need baseline metrics to know if "healthy brain" is working — but the goal is to *reduce* engagement metrics, not maximise them.

**What to track** (to reduce):
- Session length (shorter is better)
- Time in each app section (less browsing, more meeting)
- Conversion funnel: viewed → commented → invited → met (higher conversion = less wasted time)

**Architecture readiness**: Domain events in SECURITY DEFINER functions map directly to analytics events. Frontend events (page views, session timing) need PostHog JS SDK. Self-hosted PostHog on EU infrastructure with cookie consent.

## Prevention

- Before adding any external dependency, check: is it US-hosted? Can it be self-hosted on EU infrastructure?
- Before writing user-facing copy, check: does this language welcome people across backgrounds?
- Before extracting a module as open source, check: is it novel enough to attract contributors? Or is it just technically portable?
- When adding analytics, always ask: are we tracking this to reduce it or to increase it?
- Self-host all CDN assets (CSS, fonts, icons) — don't rely on third-party CDNs that leak user IPs.

## Related

- `docs/design/shared-infrastructure-opportunities.md` — original vision
- `docs/design/shared-infrastructure-review-2026-03-25.md` — current state scorecard
- `docs/plans/2026-03-25-fix-sovereignty-remediation-plan.md` — remediation plan
- `docs/design/design-principles.md` — design values
- `~/rebuild/` — Rebuild framework context
- `docs/solutions/architecture/service-layer-and-test-portability-patterns.md` — service interface patterns
- `docs/solutions/security-issues/column-level-access-and-security-definer-patterns.md` — security patterns
