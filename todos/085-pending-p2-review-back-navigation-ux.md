---
status: pending
priority: p2
issue_id: "085"
tags: [ux, navigation, review-needed]
dependencies: ["083"]
---

# Review back navigation UX with user testing

## Current Implementation

Back buttons show explicit destinations: "← back to profile" or "← back to discover" based on `?from=` query param propagated through navigation chain (profile → conversation → meeting all carry the `from` param).

This approach was flagged as potentially overengineered. The `?from=` param chain works for simple hops but may not cover all real navigation paths (e.g. deep-linking, browser refresh loses the param).

## Review Questions

- Does the explicit label ("back to profile" / "back to discover") actually help users, or is plain "← back" sufficient?
- Does the `?from=` propagation break in practice? (refresh, deep link, share URL)
- Once conversation + meeting views are unified (todo #083), does this become moot?

## Source

- User testing session 2026-03-27: "back button should say where it goes"
- Follow-up discussion: may be overengineered, needs validation with real usage
