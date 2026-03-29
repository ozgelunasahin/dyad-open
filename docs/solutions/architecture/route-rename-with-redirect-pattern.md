---
topic: Renaming SvelteKit routes while preserving bookmarks and SEO
date: 2026-03-27
prs: [59]
tags: [sveltekit, routing, migration, redirects]
---

# Route Rename with Redirect Pattern

## Context

PR #59 renamed `/prompts/*` to `/conversations/*` to align routes with user-facing domain language. The internal model uses "prompt" (the database table is `prompts`), but user-facing copy says "conversation." Having `/prompts/` in the URL bar contradicted the UI copy and confused users during testing.

This rename touched every file that referenced the route: page components, server loaders, API calls in templates, navigation links, E2E tests, and the hooks middleware. It also needed to preserve any bookmarked or shared URLs.

## What We Learned

1. **API endpoints can stay unchanged.** The rename only applied to user-facing page routes (`/prompts/[id]` -> `/conversations/[id]`). API routes (`/api/prompts/[id]/invitations`) kept the internal vocabulary because they are developer-facing, not user-facing. This halved the migration surface and avoided breaking any `fetch()` calls in client code.

2. **SvelteKit hooks are the right place for redirects.** Adding a redirect in `hooks.server.ts` catches all old URLs in one place:

   ```typescript
   // In hooks.server.ts
   if (url.pathname.startsWith('/prompts/')) {
       const newPath = url.pathname.replace('/prompts/', '/conversations/');
       throw redirect(302, newPath + url.search);
   }
   ```

   This is better than adding redirect logic in each old route's `+page.server.ts` because: (a) you don't need to keep the old route files around, (b) it catches all sub-paths automatically, and (c) it runs before any loader logic.

3. **The feedback gate exempt list needs updating.** The `hooks.server.ts` feedback gate checks a list of exempt path prefixes. When routes are renamed, the exempt list must be updated or the feedback gate will intercept the new routes. This was a near-miss in PR #59 -- the gate exempted `/prompts/` but the new `/conversations/` path wasn't initially added.

4. **E2E tests are the best safety net.** The E2E tests in PR #58 (written one PR earlier) immediately caught broken URLs after the rename. Tests that navigated to `/prompts/[id]` failed, making the required updates obvious. Without E2E tests, the rename would have relied entirely on manual clicking.

5. **Domain language alignment pays off early.** The rename could have been deferred ("it's just a URL"), but every user testing session surfaced confusion when the URL said "prompts" and the page said "conversation." Doing the rename before the first public deploy avoided a harder migration with real external links to break.

## The Fix / Pattern

For SvelteKit route renames:

1. **Move the route directory** (`src/routes/(app)/prompts/` -> `src/routes/(app)/conversations/`)
2. **Add a hooks redirect** for the old path prefix (302, not 301, until you're confident)
3. **Update all internal links** -- search for the old path string across all `.svelte` and `.ts` files
4. **Leave API routes unchanged** if they use internal vocabulary
5. **Update the feedback gate exempt list** and any other path-matching middleware
6. **Run E2E tests** -- they will catch any missed references
7. **Promote to 301** after a bake period (when you're sure no rollback is needed)

Use 302 (temporary) initially because: if you discover a problem and need to rollback, browsers that cached a 301 will not re-check the old URL. 302s are always re-checked.

## Why This Matters

Route renames feel mechanical but have a large blast radius in SvelteKit apps. The hooks middleware, feedback gate, navigation components, E2E tests, and any hardcoded URLs in email templates all need updating. Having a checklist prevents the "one more thing" syndrome where you fix routes but forget the gate, fix the gate but forget the emails, and so on.
