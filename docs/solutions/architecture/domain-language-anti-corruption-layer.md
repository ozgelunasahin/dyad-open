---
topic: Domain language anti-corruption layer — internal "prompt" vs user-facing "conversation"
date: 2026-03-27
prs: [42, 44]
tags: [domain-language, anti-corruption-layer, terminology, ux-copy, ddd]
---

# Domain Language Anti-Corruption Layer

## Context

The backend data model uses "prompt" for the written conversation starter, "comment" for user responses, and "time_slot" for meeting availability. These are precise technical terms that make sense in code. But users should never see them. PR #42 replaced all user-facing instances of "prompt" with "conversation", and PR #44 renamed "comment"/"note" to "response" and introduced a response-first invitation flow.

This sounds like a simple find-and-replace. It was not.

## What We Learned

### The boundary is the component, not a translation layer

DDD literature recommends an anti-corruption layer -- a translation boundary between two models. In a typical backend system, this is a service or adapter. In a SvelteKit app, the boundary is inside the Svelte component itself. The server load function returns `data.prompt` (internal model). The template renders "conversation" (user-facing language). There is no intermediate translation object.

This means every component is responsible for never leaking internal vocabulary into user-visible text. There is no central enforcement.

### URLs are part of the internal model, not the user model

PR #42 explicitly decided to keep `/prompts/` in URL paths even though user-facing copy says "conversation". Rationale: URLs are technical artifacts, users do not read them carefully, and renaming routes breaks bookmarks. This is a conscious layering decision -- URLs belong to the internal model, not the user-facing language.

If you later want to rename URLs (e.g., `/conversations/`), that is a routing change with redirect handling, not a terminology change.

### One rename reveals a design flaw

Renaming "comment" to "response" (PR #44) was not just terminology -- it revealed that the UI's information architecture was wrong. The original design showed comments and invitations as separate, independent sections. But renaming "comment" to "response" made the dependency obvious: a response is not a casual comment, it is the prerequisite for an invitation. "Write a response to unlock the invitation flow."

This led to the response-first design: the response section appears first, and the invitation section only appears after a response exists. The `hasResponse` derived state gates the UI:

```typescript
let hasResponse = $derived(!!data.myComment || responseStatus === 'sent');
```

The terminology change drove the UX change, not the other way around.

### Grep is your acceptance test

PR #42 used a grep check as the acceptance criterion: zero user-facing instances of the word "prompt" in rendered text. This caught instances in:

- `<title>` tags (browser tab)
- `<meta>` descriptions (SEO)
- Placeholder text in form inputs
- Button labels
- Empty state messages
- Error messages (these are easy to miss)

Hardcoded strings scattered across 6 files required editing 18 instances. PR #42 also filed a follow-up todo (#073) to extract all user-facing copy into a central `src/lib/copy.ts` file so that future terminology changes are single-file edits.

### The vocabulary map as a living document

`docs/design/domain-language.md` maps every internal term to its user-facing equivalent and documents conflicts to watch (e.g., "conversation" could imply a chat feature; API error messages must be caught and rephrased). This document is the source of truth for anyone writing user-facing copy.

## The Fix / Pattern

1. **Internal model stays internal**: DB columns, API fields, TypeScript types, URL paths all use the technical term (`prompt`, `comment`, `time_slot`)
2. **User-facing text uses natural language**: Components translate at the template layer (`"conversation"`, `"response"`, `"available time"`)
3. **No translation middleware**: The boundary is inside each `.svelte` file. Keep the vocabulary map current as the reference
4. **Grep to verify**: After any terminology change, grep the rendered-text patterns to confirm zero leakage
5. **Extract copy for scale**: For apps with more than a few pages, centralize user-facing strings in a copy module. This also enables future i18n

## Why This Matters

Terminology leaks erode user trust. A user who sees "Failed to create prompt" does not know what a prompt is. "Something went wrong" is better. More importantly, the act of translating forces you to think about the user's mental model, not just the developer's data model. In this case, that thinking revealed the response-first design pattern, which became a core product principle.
