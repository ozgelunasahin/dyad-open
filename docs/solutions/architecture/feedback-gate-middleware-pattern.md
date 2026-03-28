---
topic: Feedback gate as server middleware — fail-open, dual response
date: 2026-03-27
prs: [36, 37]
tags: [sveltekit, middleware, hooks, feedback-gate, fail-open]
---

# Feedback Gate as Server Middleware

## Context

After a meeting occurs, both participants must submit feedback before they can use the rest of the app. This "gate" needed to intercept every authenticated request and redirect to the feedback form. The initial implementation was inline in `hooks.server.ts`; PR #37 extracted it to a GateService.

## What We Learned

### 1. A database query on every authenticated request is a real cost

The gate check queries `feedback_forms` for any `state = 'due'` row matching the user. This happens on every page load, every API call, every asset request that isn't exempt. The indexed partial index (`WHERE state = 'due'`) keeps this fast, but it's still a query per request.

The exempt list matters enormously:

```typescript
const isExempt =
  pathname.startsWith('/_app/') ||        // SvelteKit internal
  pathname.startsWith('/feedback') ||      // The gate destination itself
  pathname.startsWith('/api/feedback') ||  // Feedback API
  pathname.startsWith('/api/auth') ||      // Auth flows
  pathname.startsWith('/api/vocabulary') || // Feedback form needs vocabulary
  pathname.startsWith('/auth') ||          // OAuth callbacks
  pathname.startsWith('/logout') ||        // Must always be able to leave
  pathname.endsWith('.webmanifest') ||     // PWA manifest
  pathname.startsWith('/service-worker') ||
  pathname.startsWith('/favicon');
```

Missing an exempt path causes an infinite redirect loop. Missing `/api/vocabulary` means the feedback form can't load its tag vocabulary. Missing `/logout` means a gated user can never sign out. This list will need updating whenever new infrastructure routes are added.

### 2. Dual response format: redirects for pages, JSON for API

The gate must handle two request types differently:

- **Page requests**: Return a 303 redirect to `/feedback/{formId}`
- **API requests**: Return a 403 JSON response with `{ error: 'gated', feedbackFormId: '...' }`

The client-side code needs to check for 403 + `error: 'gated'` and redirect from there. Without the JSON variant, API calls from interactive components would get HTML redirect responses that look like network errors.

### 3. Fail-open, not fail-closed

The original inline implementation wrapped the gate check in try/catch and silently continued on error. PR #37's `GateService.checkGate()` does the same: if the database query fails, it returns `{ gated: false }`.

This is deliberate: a database outage or RLS misconfiguration should not lock every user out of the entire app. The feedback gate is a product feature, not a security boundary. A missed gate check means a user skips feedback for one meeting -- an annoyance, not a vulnerability.

The opposite choice (fail-closed) would mean any database hiccup makes the app unusable for all authenticated users.

### 4. Dynamic import to avoid circular dependencies

PR #37 changed the hooks to use dynamic import:

```typescript
const { SupabaseGateService } = await import('$lib/services/gate.js');
```

This avoids pulling the service layer into the hooks module's static dependency graph, which can cause issues with SvelteKit's server module resolution during build.

## The Fix / Pattern

- Gate middleware belongs in `hooks.server.ts`, not in individual route loaders (it must be inescapable)
- Use a partial index on the gating column for performance (`WHERE state = 'due'`)
- Maintain an explicit exempt list and review it when adding routes
- Return different response formats for page vs API requests
- Always fail open for product gates; fail closed only for security gates
- Use `maybeSingle()` instead of `single()` for the gate query (non-existent form is the happy path, not an error)

## Why This Matters

Any middleware that runs on every request is a performance-sensitive, failure-sensitive chokepoint. A future developer adding a second gate (e.g., "complete your profile") should follow the same patterns: partial index, explicit exemptions, fail-open, dual response. Getting any of these wrong causes either performance degradation, infinite redirect loops, or app-wide lockouts.
