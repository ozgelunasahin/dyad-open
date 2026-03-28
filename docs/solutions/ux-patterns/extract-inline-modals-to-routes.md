---
topic: Extract inline modals to dedicated routes for maintainability
date: 2026-03-27
prs: [53, 50]
tags: [sveltekit, modals, landing-page, architecture, component-extraction]
---

# Extract Inline Modals to Dedicated Routes

## Context

Before PR #53, the landing page (`src/routes/+page.svelte`) was a ~400-line monolith containing:

- The split-screen layout (hero left, cards right)
- A **login modal** with email/password auth, password reset flow, loading states, and error handling (~60 lines of script + ~50 lines of template)
- A **join/waitlist modal** with 5 form fields, city autocomplete dropdown, submission states, and error handling (~80 lines of script + ~70 lines of template)
- A city rotation animation
- A prompt card list with date formatting
- A Supabase browser client instantiation (imported only for the login modal)

PR #53 replaced this with ~50 lines: the layout, a `RotatingHeadline` component, `ConversationCard` components, and plain `<a href="/login">` and `<a href="/waitlist">` links.

Similarly, PR #50 replaced the profile page's flat tab list with a 2x2 action grid that uses client-side view switching (`activeView` state) rather than separate routes. This created the opposite problem: navigation state that doesn't survive a page refresh and can't be linked to.

## What We Learned

1. **Inline modals that contain full forms should be routes.** The login modal had its own state machine (idle/loading/reset_sent/error), its own Supabase client, and its own form validation. That's a page, not a modal. Moving it to `/login` eliminated the Supabase browser client import from the landing page entirely.

2. **Modals create implicit dependencies.** The landing page imported `createBrowserClient`, `fade`, `fly`, `onMount`, and 8 `$state` variables solely for the modals. These dependencies bloated the component and made it harder to understand what the landing page actually does (show a hero + card list).

3. **Client-side view switching is not a substitute for routes.** PR #50's profile page uses `activeView = $state<'overview' | 'conversations' | 'meetings' | 'archive' | 'invitations'>('overview')` to toggle between views. This means: no deep linking to "my meetings," no browser back button to return to overview, no bookmarkable URLs, and state lost on refresh. For a hub page with distinct sub-views, these should be routes or at minimum use URL search params.

4. **Component extraction follows naturally.** Once the modals were gone, the remaining landing page code was clean enough to extract `RotatingHeadline` and `ConversationCard` as reusable components. The card component was immediately reusable (though currently only used on the landing page).

## The Fix / Pattern

**When to keep a modal inline:**
- Confirmation dialogs ("Are you sure?")
- Lightweight overlays that don't have their own state machine (e.g., image lightbox)
- Overlays that need the parent's data context without refetching

**When to extract to a route:**
- The modal has its own form with validation and submission
- The modal imports dependencies the parent page doesn't otherwise need
- The modal has a multi-step flow (login -> reset password -> confirmation)
- Users might want to navigate directly to it (e.g., `/login`)

**For hub pages with sub-views (profile):**
- If the sub-view is a list that can be deep-linked, use a route (`/profile/meetings`)
- If the sub-view is a lightweight toggle (map vs. list on discover), client-side state is fine
- If using client-side state, consider syncing to `$page.url.searchParams` for back-button support

## Why This Matters

The landing page went from 400 lines to 50 lines. That's not just fewer lines -- it's a page that does one thing (present the product) instead of three things (present, authenticate, and collect waitlist signups). Each concern is now independently testable, independently deployable, and independently understandable.
