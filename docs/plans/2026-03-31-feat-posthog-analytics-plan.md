---
title: "feat: PostHog analytics integration"
type: feat
status: active
date: 2026-03-31
---

# PostHog Analytics Integration

Add user behaviour tracking with PostHog to understand how testers use dyad during the alpha. EU-hosted, GDPR-compliant, no session recording initially.

## Acceptance Criteria

- [ ] PostHog JS SDK initialises in the browser on authenticated pages
- [ ] Automatic page view tracking on SvelteKit route changes
- [ ] Logged-in users identified by their Supabase user ID (not email)
- [ ] EU Cloud instance (`eu.i.posthog.com`) — data stays in Frankfurt
- [ ] PostHog project API key stored as `PUBLIC_POSTHOG_KEY` env var
- [ ] No tracking on landing page for anonymous visitors (GDPR: no consent mechanism yet)
- [ ] No session recording (can be enabled later via PostHog dashboard)
- [ ] No tracking of PII (no email, no name, no location in event properties)

## Implementation

### Phase 1: SDK setup (this PR)

1. `npm install posthog-js`
2. Initialise in `src/routes/(app)/+layout.svelte` (authenticated routes only)
3. Track page views on `$page` changes via `$effect`
4. Identify user with Supabase `user.id` only
5. Add `PUBLIC_POSTHOG_KEY` to Cloudflare Pages env vars

### Phase 2: Custom events (follow-up, for co-founder)

Wire these domain events (from `docs/design/shared-infrastructure-review-2026-03-25.md`):

| Event | Where to emit | Properties |
|-------|--------------|------------|
| `conversation_published` | `/api/prompts/[id]` PATCH (publish) | `prompt_id`, `has_cover`, `slot_count` |
| `response_sent` | `/api/prompts/[id]/comments` POST | `prompt_id` |
| `invitation_sent` | `/api/invitations` POST | `prompt_id` |
| `invitation_accepted` | `/api/invitations/[id]/accept` POST | `prompt_id` |
| `meeting_cancelled` | `/api/meetings/[id]/cancel` POST | `tier` (early/late) |
| `feedback_submitted` | `/api/feedback/[id]` POST | `did_meet` |
| `waitlist_joined` | `/api/contact` POST | `city` |

These are server-side events — use PostHog's Node SDK or a simple `fetch` to the PostHog API.

## Sovereignty

PostHog EU Cloud is hosted in Frankfurt (AWS eu-central-1). Data does not leave the EU. This satisfies the sovereignty requirements in `docs/design/shared-infrastructure-opportunities.md`. Self-hosting is possible later but not needed for alpha scale.

## Files

- `src/routes/(app)/+layout.svelte` — init + page view tracking
- `package.json` — add `posthog-js` dependency

## Sources

- PostHog SvelteKit docs: posthog.com/docs/libraries/svelte
- Sovereignty review: `docs/design/shared-infrastructure-review-2026-03-25.md`
- EU Cloud: `eu.i.posthog.com`
