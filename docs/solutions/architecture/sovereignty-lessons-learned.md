---
title: Where sovereignty issues hide in modern web apps
category: architecture
tags: [sovereignty, eu-infrastructure, rebuild, lessons-learned]
date: 2026-03-25
prs: [37]
---

# Where Sovereignty Issues Hide

Lessons from auditing a web application for sovereignty compliance. These are the non-obvious places where dependencies creep in despite an explicit commitment to sovereign infrastructure.

## Sovereignty is a spectrum, not a checkbox

"Is it EU-hosted?" is only the first question. Sovereignty has multiple dimensions:

| Level | Example | What you control |
|---|---|---|
| US cloud service | AWS us-east-1, Google Cloud | Nothing — data subject to CLOUD Act, FISA |
| US company, EU-hosted | AWS Frankfurt, Cloudflare EU edge | Data location, but not jurisdiction. US government can compel access. |
| EU company, managed service | Mailjet, Hetzner Cloud | Jurisdiction + data location. But you depend on the company's continuity and terms. |
| Open-source, managed hosting | Supabase Cloud EU, PostHog Cloud EU | Jurisdiction + exit path. If provider changes, you can self-host. |
| Self-hosted open-source | Supabase on Hetzner, PostHog on your VPS | Full control. But you carry the operational burden. |
| Community-governed open-source | Matrix/Element, Mastodon | Full control + collective governance. Roadmap isn't driven by a single company's investors. |

Each level up gives you more control but more operational responsibility. The right level depends on the sensitivity of the data and the criticality of the service. Auth and user data warrant a higher sovereignty level than, say, a CSS CDN.

There's also a **distribution axis** that's orthogonal to the ownership axis:

| Model | What it means | Trade-off |
|---|---|---|
| Centralised | One instance, one operator | Simple to run, single point of control and failure |
| Replicated | Multiple copies, one operator | Resilience, but still single governance |
| Federated | Multiple instances, multiple operators | Distributed governance, but coordination overhead. Users can move between instances. |
| Peer-to-peer | No central infrastructure | Maximum sovereignty, minimum reliability guarantees |

Federation matters for sovereignty because it distributes *governance*, not just hosting. A federated service can't be shut down by a single jurisdiction, company, or administrator. But it introduces complexity (protocol design, moderation across instances, identity portability) that may not be justified for every service.

The question isn't "should everything be federated?" but "which services benefit from distributed governance, and which are fine centralised?" For a regional community platform, the answer might be: identity and reputation benefit from federation (portable across instances); the meeting coordination and feedback mechanics are fine centralised (per-community).

When evaluating a dependency, ask not just "where is the data?" but also: who owns the company? Who can compel access? What happens if the service disappears? Can you migrate away without rewriting code? And — who governs the rules of the system?

## 1. Libraries that phone home for runtime assets

**The issue**: A mapping library was installed locally via npm, but its default configuration loaded icons, CSS, and font files from a US-hosted CDN at runtime. The JavaScript was bundled locally — but every page view made external requests that leaked user IP addresses.

**Why it's non-obvious**: The import statement looks local. The bundle is local. But the browser's network tab tells a different story. Many libraries ship with default asset URLs pointing to public CDNs (unpkg, cdnjs, Google Fonts). These defaults persist unless explicitly overridden.

**What to do**: Self-host all runtime assets. Copy them from `node_modules` into your static directory. Override default asset URLs in library configuration. Check the network tab in your browser, not just your import statements — if a request leaves your domain, it's a sovereignty leak.

## 2. Hardcoded service URLs masquerading as content

**The issue**: Static assets (logos, background images) were referenced by their full cloud storage URL across 17 files. They worked perfectly — but they coupled the entire frontend to a specific cloud provider instance.

**Why it's non-obvious**: Public asset URLs feel harmless. They're just images. But each one is a hard dependency on a specific provider, region, and account. Moving the backend to a different host means find-and-replace across the codebase.

**What to do**: Truly static assets (logos, icons, backgrounds) belong in your repository's static directory, not in cloud storage. Dynamic assets (user uploads) should reference a base URL from environment configuration, never a hardcoded provider URL. Search your codebase for your provider's domain — every match is a portability problem.

## 3. Email as an afterthought

**The issue**: A US-based email delivery service was chosen for its developer-friendly SDK. Every transactional email (welcome messages, invitations) routed user names, email addresses, and authentication tokens through US infrastructure.

**Why it's non-obvious**: Email feels like commodity infrastructure. You pick a provider, get an API key, and move on. But email carries PII — names, addresses, content — and the provider choice has direct GDPR implications. A convenient API and nice documentation aren't sovereignty criteria.

**What to do**: Use SMTP as your email interface, not vendor-specific SDKs. Any SMTP server can be swapped by changing environment variables. For local development, use a mail capture tool (Mailpit, MailHog, Inbucket) that catches all outgoing email without sending it. For production, pick an EU-hosted SMTP provider. The abstraction costs nothing and gives you complete provider independence.

## 4. Auth provider functions baked into every database policy

**The issue**: The auth provider exposes a convenience function (`auth.uid()`) for use in row-level security policies. It feels like a database function, but it's actually a provider-specific function that reads JWT claims in a provider-specific format. After building 6 backend features, this function appeared 27 times across 5 migration files. Every security policy depends on it.

**Why it's non-obvious**: The function integrates seamlessly with PostgreSQL. It's called in SQL, returns a UUID, works in RLS policies and stored procedures. It *feels* native. But it's a vendor extension that doesn't exist in a standard PostgreSQL installation. Moving to a different auth provider means rewriting every policy that references it.

**What we learned**: Use `IS NOT NULL` checks rather than role-specific checks (more portable across auth systems). More importantly: create your own wrapper function (`app.current_user_id()`) from day one that delegates to the provider's function internally. When you switch providers, you change one function definition — not 27 policies.

## 5. Hosting coupling: deep vs shallow

**The issue**: The app used a platform-specific build adapter (Cloudflare Pages). This looked like lock-in but was actually a shallow coupling — one config file, no platform-specific APIs. The real hosting dependency was the backend-as-a-service, not the frontend deployment target.

**Why it's non-obvious (in the other direction)**: Shallow hosting coupling isn't urgent. If your app doesn't use platform-specific APIs (edge functions, KV stores, object storage via proprietary SDK), the build adapter is a trivial swap. The deep coupling is in the services your app depends on at runtime — database, auth, storage, email. Focus your sovereignty effort there.

**What to do**: Distinguish between build-time coupling (adapters, CI pipelines — cheap to change) and runtime coupling (database queries, auth flows, storage APIs — expensive to change). Prioritise decoupling the runtime dependencies.

## Prevention checklist

When adding any dependency or building any feature:

- [ ] Check the browser network tab — are runtime assets loading from external CDNs?
- [ ] Search your codebase for provider-specific domain names — any hardcoded URLs?
- [ ] Does your email provider store and process data in the EU?
- [ ] Are your database security policies using provider-specific functions? Could they be wrapped?
- [ ] Is your hosting coupling deep (platform APIs) or shallow (build config)?
- [ ] For any new service integration: where does the data physically reside?
- [ ] What sovereignty level does this service operate at? (see spectrum above)
- [ ] Who owns the company behind this service? Who are their investors? What jurisdiction are they subject to?
- [ ] If this service disappears tomorrow, can you self-host or migrate?
