---
status: pending
priority: p2
issue_id: "080"
tags: [code-review, security, validation]
dependencies: []
---

# Cover Image URL Accepted Without Validation

## Problem Statement

The `coverImageUrl` field in prompt create/update API endpoints accepts any URL without validation. While the normal flow uploads through `/api/upload` (returning a Supabase storage URL), nothing prevents a direct API call with an arbitrary external URL. This allows tracking pixels, content spoofing, and potential future SSRF.

## Findings

**Source:** security-sentinel (PR #51 review)

Pre-existing issue, but PR #51 adds a new full-width edge-to-edge rendering surface that increases the impact. The URL is rendered across 5 pages:
- `prompts/[id]/+page.svelte` — full-width cover (new in PR #51)
- `discover/+page.svelte` — list thumbnails
- `MapView.svelte` — map pin images
- `BottomSheet.svelte` — bottom sheet thumbnails
- `+page.svelte` — landing page

Svelte's `{expression}` in `src` attributes auto-escapes, so `javascript:` URLs are not exploitable. But arbitrary external URLs allow IP/timing leakage via tracking pixels.

## Proposed Solutions

### Solution A: URL allowlist validation (Recommended)
Validate that `coverImageUrl` starts with the Supabase storage base URL:
```ts
if (body.coverImageUrl !== undefined) {
  if (typeof body.coverImageUrl !== 'string' ||
      !body.coverImageUrl.startsWith(PUBLIC_SUPABASE_URL + '/storage/')) {
    return json({ error: 'Invalid cover image URL' }, { status: 400 });
  }
}
```
- **Effort:** Small
- **Risk:** None

## Technical Details

- **Affected files:** `src/routes/api/prompts/+server.ts`, `src/routes/api/prompts/[id]/+server.ts`

## Acceptance Criteria

- [ ] Cover image URL is validated against Supabase storage base URL
- [ ] Arbitrary external URLs are rejected with 400

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-26 | Created from PR #51 security review | Validate URLs at API boundary, not just at the upload flow |
