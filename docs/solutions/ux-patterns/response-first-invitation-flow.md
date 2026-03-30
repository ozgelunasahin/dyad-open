---
topic: Response-first invitation flow — gating invitations behind written engagement
date: 2026-03-27
prs: [44, 79]
tags: [ux, invitation-flow, response-first, progressive-disclosure, engagement]
related: [vague-slots-progressive-disclosure-before-response.md]
---

# Response-First Invitation Flow

## Context

PR #44 restructured the prompt detail page to require a written response before showing the invitation flow. Previously, the page showed available time slots and a comment form as independent sections -- a reader could invite the author to meet without ever engaging with the content. The response-first design gates the invitation behind genuine engagement.

## What We Learned

### The old layout buried the relationship between response and invitation

The original prompt detail page (PRs #41-42) had three independent sections stacked vertically:

1. Prompt content (`{@html body_html}`)
2. Available time slots (with "Select" buttons)
3. Comment form ("Leave a note")

A reader could scroll straight to the time slots, select one, and send an invitation with an optional message. The comment was unrelated to the invitation. This undermined the platform's core principle: the response IS the meeting context. Meeting a stranger is meaningful only when both parties have engaged with the conversation topic.

### Progressive disclosure matches the user's commitment arc

The response-first layout uses progressive disclosure based on a derived state:

```typescript
let hasResponse = $derived(!!data.myComment || responseStatus === 'sent');
```

The page renders in stages:

1. **Always visible**: Prompt content, "Write a response" section
2. **After response**: "Pick a time to meet" section with available slots and invite button
3. **Before response**: A teaser: "Write a response to unlock the invitation flow"

The teaser is important -- it communicates that slots exist without showing them, creating motivation to write the response. Without it, users would not know that there is more to the page.

### The invite message was removed, not just hidden

The original design had an optional message field in the invitation form. PR #44 removed it entirely. The response IS the message. The invitation API call now sends only the slot ID:

```typescript
body: JSON.stringify({ slotId: selectedSlotId })
```

The explainer text makes this explicit: "Your response will be shared with the author as the basis for your conversation."

This is a product decision embedded in the UI: there should be no channel for pre-meeting chitchat. The response is the only communication before the meeting. This prevents the pattern where messaging platforms become an end in themselves and meetings never happen.

### Copy-on-write for Set reactivity in Svelte 5

The feedback form's tag selection (also in this PR) demonstrates the copy-on-write pattern for `Set` with Svelte 5 runes:

```typescript
let selectedTags = $state<Set<string>>(new Set());

function toggleTag(tag: string) {
  const next = new Set(selectedTags);  // Copy
  if (next.has(tag)) next.delete(tag);
  else next.add(tag);
  selectedTags = next;  // Assign new reference to trigger reactivity
}
```

Svelte 5 runes track reactivity by assignment, not mutation. `selectedTags.add(tag)` would mutate the existing Set without triggering a re-render. Creating a new Set and assigning it is mandatory. This pattern appears throughout the codebase (Map for cards, Set for tags, Set for selected days) and is the most common Svelte 5 gotcha.

## The Fix / Pattern

1. **Derive a gate state** from existing data (`hasResponse`)
2. **Show the next step only after the gate is satisfied** (response written)
3. **Show a teaser for the gated content** to communicate that more exists
4. **Remove redundant communication channels** (invite message) when the gate provides the content
5. **Use `$derived` for the gate**, not `$state` -- the gate should be a pure function of existing data, not manually managed

## Why This Matters

Progressive disclosure is a standard UX pattern, but the non-obvious insight here is that the act of renaming ("comment" to "response") revealed the design flaw. When you call it a "comment," it feels optional and disconnected. When you call it a "response," the dependency on it becomes obvious: you cannot invite someone to a conversation you have not responded to. The terminology change drove the UX change.

This is also a product principle: dyad is not a messaging platform. Every design decision should make it harder to fall into the pattern of texting without meeting. The response-first flow ensures that the only path to a meeting goes through genuine engagement with the conversation topic.
