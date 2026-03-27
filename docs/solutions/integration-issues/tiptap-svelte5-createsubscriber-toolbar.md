---
topic: Bridging TipTap editor state into Svelte 5 runes with createSubscriber
date: 2026-03-27
prs: [40]
tags: [svelte5, tiptap, reactivity, runes, createSubscriber, toolbar]
---

# TipTap Toolbar State in Svelte 5 Without Reactive Loops

## Context

PR #40 introduced a `PromptEditor.svelte` component wrapping TipTap for rich text editing. The toolbar needs to reflect the editor's current formatting state (bold active, heading level, etc.) reactively. The existing solution doc (`svelte5-tiptap-reactive-loop.md`) covers the *destructive* pattern -- calling store methods from `onUpdate` causing infinite loops. This doc covers the *constructive* pattern: how to safely read editor state into Svelte 5 runes for toolbar rendering.

TipTap's internal state is not a Svelte rune. It changes on every transaction (keystroke, selection change, formatting command). The challenge: make Svelte 5's reactivity system aware of TipTap transactions without creating a reactive loop.

## What We Learned

Svelte 5 provides `createSubscriber` from `svelte/reactivity` -- a function that bridges external event emitters into the rune dependency graph. It lets you tell Svelte "this derived value depends on an external source; here is how to subscribe to changes."

The key insight: `createSubscriber` returns a function that, when called inside a `$derived` block, registers the external subscription as a dependency. It does NOT trigger re-renders itself -- it only marks the derived value as stale when the external event fires. This is the crucial difference from calling store methods in `onUpdate`, which creates a write-read-write cycle.

## The Fix / Pattern

```typescript
import { createSubscriber } from 'svelte/reactivity';
import { Editor } from '@tiptap/core';

let editor: Editor | undefined = $state();

// 1. Create a subscriber that listens to TipTap transactions
const subscribe = createSubscriber((update) => {
  if (!editor) return;
  editor.on('transaction', update);
  return () => editor?.off('transaction', update);
});

// 2. Derive toolbar state by calling subscribe() inside $derived
let isActive = $derived.by(() => {
  subscribe(); // Registers TipTap transactions as a dependency
  return {
    bold: editor?.isActive('bold') ?? false,
    italic: editor?.isActive('italic') ?? false,
    heading1: editor?.isActive('heading', { level: 1 }) ?? false,
    heading2: editor?.isActive('heading', { level: 2 }) ?? false,
    bulletList: editor?.isActive('bulletList') ?? false,
    link: editor?.isActive('link') ?? false,
  };
});
```

The template then uses `isActive.bold`, `isActive.italic`, etc. to conditionally apply `.active` classes to toolbar buttons. No intermediate store, no reactive loop.

**What NOT to do:**

```typescript
// WRONG: Updating a $state from onUpdate creates a reactive cascade
editor.on('transaction', () => {
  isBold = editor.isActive('bold'); // Writes to $state on every transaction
});
```

This works for simple cases but becomes fragile as soon as the $state variable is used in a context that also affects the editor (e.g., toolbar button that calls `editor.chain().toggleBold().run()` -- which fires another transaction -- which updates the state -- which re-renders the button).

## Why This Matters

`createSubscriber` is the canonical Svelte 5 pattern for integrating imperative event emitters (TipTap, ProseMirror, CodeMirror, Monaco, d3, Leaflet) into the rune system. Without it, you either:

1. Use `$state` assignments in event handlers, risking reactive cascades
2. Use `$effect` to poll editor state, which is wasteful and timing-dependent
3. Abandon reactivity and manage DOM manually

The pattern applies anywhere you have a non-Svelte state source that emits change events. The PromptEditor is the reference implementation in this codebase.
