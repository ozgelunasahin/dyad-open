# Feature: In-App Feedback System

## Overview

Enable alpha users to submit bug reports and feature requests directly from the canvas page, automatically capturing context about the current application state to aid development and debugging.

## Review Findings (2026-01-19)

The following issues were identified during code review and should be addressed:

### 🔴 Critical (Must Fix)

| Issue | Risk | Resolution |
|-------|------|------------|
| No input validation | Data corruption, storage attacks | Add Zod validation |
| Unsafe JSON.parse | Server crash, prototype pollution | Add try/catch + sanitization |
| Unbounded JSONB context | 100MB+ payloads possible | Add size constraint (10KB) |
| Auth pattern mismatch | Inconsistent with codebase | Use `locals.user` not `getSession()` |

### 🟡 Important (Should Fix)

| Issue | Risk | Resolution |
|-------|------|------------|
| Incomplete RLS | No admin access to review feedback | Use Supabase dashboard for alpha |
| Missing updated_at | No audit trail | Defer to Phase 2 |
| Canvas ownership not validated | Users can claim any canvas_id | Accept for alpha (low risk) |

### 🔵 Simplifications Applied

- Removed `status` and `screenshot_url` columns (use Supabase dashboard)
- Removed indexes (premature for <100 rows)
- Reduced context fields from 12 to 6
- Inlined context capture (no separate utility file)

---

## Problem Statement

During alpha testing, users encounter bugs or have feature ideas but must switch context to report them (email, Discord, etc.). This friction reduces feedback quantity and quality. Additionally, manual reports often lack crucial context like:
- What cards were open
- Camera position and zoom level
- Browser/device information

## Proposed Solution

Add a feedback button to the canvas UI that opens a modal for submitting bug reports or feature requests. The system automatically captures application state and stores submissions in Supabase for easy retrieval.

### Key Features

1. **Feedback Button** - Floating button in bottom-right corner
2. **Feedback Modal** - Simple form with type selector and description field
3. **Context Capture** - Automatic snapshot of canvas state and environment
4. **Supabase Storage** - Feedback table with RLS for user privacy

## Technical Approach

### 1. Database Schema (Simplified for Alpha)

```sql
-- Migration: create_feedback_table.sql
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  canvas_id text,
  type text not null check (type in ('bug', 'feature', 'other')),
  description text not null check (char_length(description) between 10 and 5000),
  context jsonb not null default '{}' check (pg_column_size(context) < 10240),
  created_at timestamptz default now()
);

comment on table public.feedback is
  'User feedback. user_id set to NULL on user deletion. Review via Supabase dashboard.';

-- RLS: Insert-only for users (review via Supabase dashboard)
alter table public.feedback enable row level security;

create policy "Users can insert feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);
```

**Notes:**
- `status`, `screenshot_url`, indexes removed for alpha simplicity
- Size constraints added: description 10-5000 chars, context max 10KB
- Admin access via Supabase dashboard (no RLS policy needed)

### 2. Context Capture (Inline, Minimal)

Context is captured inline in the modal component - no separate utility file needed:

```typescript
// Inline in FeedbackModal.svelte
function captureContext(): Record<string, unknown> {
  const snapshot = $state.snapshot(canvasStore);
  return {
    cardCount: snapshot.cards.size,
    focusedCardId: snapshot.focusedCardId,
    camera: { x: snapshot.camera.x, y: snapshot.camera.y, zoom: snapshot.camera.zoom },
    userAgent: navigator.userAgent,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    url: window.location.href
  };
}
```

**Removed fields:** `editingCardId`, `activeChainIds`, `timestamp` (redundant with `created_at`), `recentErrors` (unimplemented)

### 3. API Endpoint (With Validation)

```typescript
// src/routes/api/feedback/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const VALID_TYPES = ['bug', 'feature', 'other'] as const;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_CONTEXT_SIZE = 10000; // 10KB

// Safe JSON parse with prototype pollution protection
function safeJsonParse(input: unknown): Record<string, unknown> {
  if (typeof input !== 'string' || !input) return {};
  try {
    const parsed = JSON.parse(input);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    // Strip dangerous keys
    const { __proto__, constructor, prototype, ...safe } = parsed;
    // Enforce size limit
    if (JSON.stringify(safe).length > MAX_CONTEXT_SIZE) {
      return {};
    }
    return safe;
  } catch {
    return {};
  }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  // Auth check (matches codebase pattern)
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();

  // Validate type
  const type = formData.get('type')?.toString();
  if (!type || !VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    return json({ error: 'Invalid feedback type' }, { status: 400 });
  }

  // Validate description
  const description = formData.get('description')?.toString()?.trim();
  if (!description || description.length < 10) {
    return json({ error: 'Description must be at least 10 characters' }, { status: 400 });
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return json({ error: 'Description too long' }, { status: 400 });
  }

  // Parse context safely
  const context = safeJsonParse(formData.get('context'));
  const canvasId = formData.get('canvasId')?.toString() || null;

  const { error: dbError } = await locals.supabase
    .from('feedback')
    .insert({
      user_id: locals.user.id,
      canvas_id: canvasId,
      type,
      description,
      context
    });

  if (dbError) {
    console.error('Failed to save feedback:', dbError);
    return json({ error: 'Failed to save feedback' }, { status: 500 });
  }

  return json({ success: true });
};
```

**Security improvements:**
- Uses `locals.user` (codebase pattern) instead of `getSession()`
- Validates `type` against whitelist
- Validates `description` length
- Safe JSON parsing with try/catch and prototype pollution protection
- Size limit on context
- Returns `json()` responses (codebase pattern) instead of `throw error()`

### 4. UI Components

#### Feedback Button
```svelte
<!-- In +page.svelte, near theme toggle -->
<button
  class="feedback-btn"
  onclick={() => feedbackModalOpen = true}
  title="send feedback"
>
  <!-- Simple chat icon -->
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 3h12v8H4l-2 2V3z" stroke="currentColor" stroke-width="1.5"/>
  </svg>
</button>
```

#### Feedback Modal
```svelte
<!-- src/lib/components/FeedbackModal.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { canvasStore } from '$lib/stores/canvas.svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
    canvasId: string;
  }

  let { open, onClose, canvasId }: Props = $props();
  let feedbackType = $state<'bug' | 'feature' | 'other'>('bug');
  let description = $state('');
  let submitting = $state(false);
  let error = $state<string | null>(null);

  function captureContext(): Record<string, unknown> {
    const snapshot = $state.snapshot(canvasStore);
    return {
      cardCount: snapshot.cards.size,
      focusedCardId: snapshot.focusedCardId,
      camera: { x: snapshot.camera.x, y: snapshot.camera.y, zoom: snapshot.camera.zoom },
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      url: window.location.href
    };
  }
</script>

{#if open}
  <div class="modal-overlay" onclick={onClose}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <h2>Send Feedback</h2>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <form
        method="POST"
        action="/api/feedback"
        use:enhance={() => {
          submitting = true;
          error = null;
          return async ({ result }) => {
            submitting = false;
            if (result.type === 'success') {
              onClose();
              description = '';
            } else if (result.type === 'failure') {
              error = result.data?.error || 'Failed to send feedback';
            }
          };
        }}
      >
        <input type="hidden" name="canvasId" value={canvasId} />
        <input type="hidden" name="context" value={JSON.stringify(captureContext())} />

        <fieldset>
          <legend>Type</legend>
          <label>
            <input type="radio" name="type" value="bug" bind:group={feedbackType} />
            bug report
          </label>
          <label>
            <input type="radio" name="type" value="feature" bind:group={feedbackType} />
            feature request
          </label>
          <label>
            <input type="radio" name="type" value="other" bind:group={feedbackType} />
            other
          </label>
        </fieldset>

        <label>
          Description
          <textarea
            name="description"
            bind:value={description}
            placeholder={feedbackType === 'bug'
              ? "What happened? What did you expect?"
              : "Describe your idea..."}
            required
            minlength="10"
            maxlength="5000"
            rows={5}
          />
        </label>

        <div class="modal-actions">
          <button type="button" class="cancel-btn" onclick={onClose}>cancel</button>
          <button type="submit" class="submit-btn" disabled={submitting || description.trim().length < 10}>
            {submitting ? 'sending...' : 'send feedback'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
```

## Implementation Plan

### Phase 1: Core Feedback System
1. [ ] Create Supabase migration for feedback table (simplified schema)
2. [ ] Create FeedbackModal component with inline context capture
3. [ ] Add feedback button to canvas page
4. [ ] Create API endpoint with validation
5. [ ] Test end-to-end flow
6. [ ] Add success toast notification

### Phase 2: Enhancements (If Needed)
- Add `status` column and `updated_at` for workflow
- Add rate limiting (if abuse detected)
- Add admin RLS policies
- Add screenshot capture

## File Changes

| File | Change |
|------|--------|
| `supabase/migrations/XXXXXX_create_feedback.sql` | New migration |
| `src/lib/components/FeedbackModal.svelte` | New component |
| `src/routes/canvas/[canvasId]/+page.svelte` | Add button + modal |
| `src/routes/api/feedback/+server.ts` | New API endpoint |

## Design Decisions

### Context Capture Timing
Context is captured at **form submit time**, not when modal opens.

### Error Handling
- **Validation errors**: Show inline in modal, keep modal open
- **Network errors**: Show inline, allow retry
- **Success**: Close modal, show toast

### Rate Limiting
Deferred for alpha (only ~2 users). Monitor Supabase dashboard for abuse. Can add later:
```typescript
// Simple in-memory rate limit (when needed)
const recentSubmissions = new Map<string, number>();
const RATE_LIMIT = 20; // per hour
const RATE_WINDOW = 60 * 60 * 1000;
```

### Authentication
- Feedback button only visible to authenticated users
- No anonymous feedback

## Acceptance Criteria

1. Users can click a feedback button visible on the canvas
2. Modal opens with type selection and description field
3. Submitting captures current canvas state automatically
4. Feedback is stored in Supabase with user association
5. Users receive confirmation of successful submission
6. Validation errors show inline message in modal
7. Escape key closes the modal
8. Feedback button hidden for non-authenticated users

## Privacy Considerations

- Only capture application state, not note content
- User controls what description text is included
- Context data is minimal (6 fields, <10KB)
- No PII beyond user_id
