---
status: pending
priority: p1
issue_id: "082"
tags: [domain-language, routes, refactor]
dependencies: []
---

# Rename /prompts/ routes to /conversations/

## Problem Statement

The user-facing URL is `/prompts/[id]` but the domain language doc says the user-facing term is "conversation" not "prompt". The route should be `/conversations/[id]` to match what users see in the UI.

## Scope

- Rename `src/routes/(app)/prompts/` → `src/routes/(app)/conversations/`
- Rename `src/routes/(editor)/prompts/` → `src/routes/(editor)/conversations/`
- Update all `href="/prompts/..."` links across the app
- API endpoints (`/api/prompts/`) can stay — they use internal naming
- Database table `prompts` stays — it's the internal model
- Add redirects from old URLs if needed for bookmarks

## Source

- `docs/design/domain-language.md` — internal "prompt" → user-facing "conversation"
- User testing feedback: "this is actually a conversation, not a prompt"
