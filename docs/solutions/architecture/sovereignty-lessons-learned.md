---
title: Where sovereignty issues hide in a SvelteKit + Supabase stack
category: architecture
tags: [sovereignty, eu-infrastructure, supabase, rebuild, lessons-learned]
date: 2026-03-25
prs: [37]
---

# Where Sovereignty Issues Hide

Lessons from auditing a SvelteKit + Supabase app for EU sovereignty compliance. These are the non-obvious places where US dependencies crept in despite a stated commitment to European infrastructure.

## 1. CDN-hosted CSS and icons

**What happened**: Leaflet map icons and CSS were loaded from `unpkg.com` — a US CDN backed by Cloudflare. Every user who opened the map page leaked their IP address to a US service.

**Why it's non-obvious**: The Leaflet npm package was installed locally, but the component loaded *runtime assets* from the CDN because Leaflet's default icon config points there. The code looked local (`import L from 'leaflet'`) but the browser made external requests.

**Solution**: Copy the 6 static files (CSS + PNGs) to `static/leaflet/` and reference them as local paths. The npm package provides the JS; the static files provide the assets. No CDN needed.

**Pattern**: Any library that loads runtime assets (fonts, icons, CSS) from external CDNs is a sovereignty leak, even if the JS is bundled locally. Check the network tab, not just the import statements.

## 2. Hardcoded storage URLs that look like config

**What happened**: 17 files contained `https://iwdjpuyuznzukhowxjhk.supabase.co/storage/v1/object/public/uploads/logo.png` — the Supabase project's storage URL baked into component templates. This couples every page render to a specific Supabase instance.

**Why it's non-obvious**: The URLs were for *public* assets (logos, background images). They worked in dev and production. There was no error, no warning. But they made the app impossible to self-host on a different Supabase instance without find-and-replace across 17 files.

**Solution**: Move static assets (logo, auth backgrounds) to `static/images/`. For dynamic assets (user uploads, landing page images), use the `PUBLIC_SUPABASE_URL` env var. Zero hardcoded project URLs in source.

**Pattern**: Search your codebase for your Supabase project ID. Every occurrence is a portability problem. Static assets should be in `static/`, not in remote storage.

## 3. Email provider as an afterthought

**What happened**: Resend (US company, YC-backed) was used for transactional email. Two API endpoints passed user email addresses, names, and invite tokens through US infrastructure.

**Why it's non-obvious**: Email providers feel like commodity infrastructure — you pick one, get an API key, done. But email carries PII (addresses, names, content) and the provider choice has direct GDPR implications. Resend was chosen for developer convenience (nice SDK), not for data residency.

**Solution**: Replace with nodemailer over SMTP. Local dev uses Supabase's built-in Mailpit (port 54325, viewable at :54324). Production uses any EU SMTP provider. The email utility (`src/lib/server/email.ts`) is provider-agnostic — swap by changing env vars, not code.

**Pattern**: Don't pick email providers for their SDK. Pick for their data residency. SMTP is the universal interface — use it, and you can swap providers without code changes.

## 4. `auth.uid()` in every RLS policy — the deepest coupling

**What happened**: 27 references to `auth.uid()` across 5 migration files. Every RLS policy and SECURITY DEFINER function depends on Supabase GoTrue's JWT claims structure. This is the hardest thing to change if we ever move to a different auth provider.

**Why it's non-obvious**: `auth.uid()` feels like a PostgreSQL function — it's called in SQL, it returns a UUID. But it's actually a GoTrue-specific function that reads `request.jwt.claims.sub` from the Supabase PostgREST context. It doesn't exist in plain PostgreSQL. Swapping to Authentik/Keycloak would require either creating a compatible `auth.uid()` function or rewriting 27 policy definitions.

**What we did right**: Used `auth.uid() IS NOT NULL` instead of `auth.role() = 'authenticated'` throughout. The `IS NOT NULL` pattern is more portable — any auth system that sets a user context can satisfy it. The `role` check is GoTrue-specific.

**What we'd do differently**: Create an `app.current_user_id()` wrapper function from the start that calls `auth.uid()` internally. Then swapping auth means changing one function, not 27 policies.

**Pattern**: Wrap vendor-specific SQL functions in your own function from day one. The 5 minutes it costs to create the wrapper saves days of migration later.

## 5. The adapter lock-in that isn't really lock-in

**What happened**: `@sveltejs/adapter-cloudflare` in `svelte.config.js`. This looks like a hard dependency on Cloudflare Pages, but it's actually a 1-line config change to swap to `adapter-node`.

**Why it's non-obvious (in the other direction)**: It *seems* like a big deal but it's not. The SvelteKit adapter is a build-time concern, not a runtime coupling. No Cloudflare-specific APIs (KV, Durable Objects, R2) are used. The app is a standard SSR app that happens to deploy on Cloudflare. Swapping to Hetzner + Node.js is trivial.

**Pattern**: Check whether your hosting coupling is deep (using platform APIs) or shallow (just the build adapter). Shallow coupling is fine to defer.

## Prevention checklist

When adding any dependency or writing any component:

- [ ] Search the network tab for external requests — are CDN assets loading from US servers?
- [ ] Search your codebase for your Supabase project ID — any hardcoded instance URLs?
- [ ] Does your email provider store data in the EU?
- [ ] Are your SQL functions using vendor-specific auth calls? Could they be wrapped?
- [ ] Is your hosting lock-in deep (platform APIs) or shallow (build adapter)?
