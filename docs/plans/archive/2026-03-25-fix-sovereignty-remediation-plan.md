---
title: "fix: Sovereignty and GDPR remediation"
type: fix
status: active
date: 2026-03-25
---

# Sovereignty and GDPR Remediation

Address the critical sovereignty violations and GDPR compliance gaps identified in the shared infrastructure review.

## Issues to Address

### Critical (before any real user data)

1. **Supabase region** — Provision new project on EU region (Frankfurt `eu-central-1`) or verify current region. No real user data exists yet, so this is a clean migration.

2. **Resend → EU email** — Replace Resend (US) with an EU-hosted provider. Options:
   - Mailjet (French company, EU hosting, free tier for low volume)
   - Self-hosted Postal (requires server)
   - For v0.1-rc: SMTP-based sending via any EU provider

   Affected files: `src/routes/api/contact/+server.ts`, `src/routes/api/invites/+server.ts`

3. **Self-host Leaflet assets** — Copy marker icons + CSS from unpkg to `static/leaflet/`. Update `src/lib/components/MapView.svelte`.

4. **Extract hardcoded Supabase URLs** — Replace 17 instances of `iwdjpuyuznzukhowxjhk.supabase.co` with an environment variable `PUBLIC_STORAGE_URL`. Affected: 14 files across `src/`.

### Important (before production launch)

5. **Add adapter-node** — Support both Cloudflare and standard Node.js hosting. Change `svelte.config.js` to use `adapter-auto` or add a build flag.

6. **GDPR data export** — `GET /api/account/export` endpoint that produces JSON of all user data (profile, prompts, comments, invitations, meetings, feedback, bookmarks). Art. 20 DSGVO requirement.

7. **Storage abstraction** — Create `StorageService` interface wrapping `supabase.storage`. 1 route file, 46 LOC.

### Housekeeping

8. **Wire GateService or delete** — `src/lib/services/gate.ts` is dead code. Either import it in `hooks.server.ts` or remove it.

9. **Gate query caching** — Add short-lived cookie/memory cache for the gate check (30-60s TTL).

## Implementation Approach

Items 1-4 can be one PR. Items 5-7 are separate PRs. Items 8-9 are quick fixes.

### Phase 1: Quick sovereignty fixes (one PR)

- [ ] Self-host Leaflet assets (copy 4 files to `static/leaflet/`, update MapView)
- [ ] Extract hardcoded Supabase URLs to `PUBLIC_STORAGE_URL` env var
- [ ] Replace Resend with EU email provider (or abstract to SMTP)
- [ ] Wire GateService into hooks.server.ts (replace inline query)
- [ ] Verify/document Supabase region status

### Phase 2: GDPR compliance (separate PR)

- [ ] `GET /api/account/export` — JSON export of all user data
- [ ] Account deletion endpoint (Step 7 scope, but tracked here for completeness)

### Phase 3: Hosting flexibility (separate PR)

- [ ] Add `adapter-node` support alongside Cloudflare
- [ ] Document deployment on Hetzner

## Acceptance Criteria

- [ ] No US-hosted CDN assets loaded by default
- [ ] No hardcoded Supabase project URLs in source
- [ ] Email delivery through EU provider
- [ ] Users can export their data
- [ ] App can be built for standard Node.js hosting

## Dependencies

- Supabase region migration: may require updating `.env.local` and production env vars with new project URL/keys
- Email provider swap: need API key for chosen EU provider
- adapter-node: may need testing for SSR compatibility with current code
