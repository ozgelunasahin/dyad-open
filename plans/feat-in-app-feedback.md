# Feature: In-App Feedback System

## Overview

Enable alpha users to submit bug reports and feature requests directly from the canvas page, automatically capturing context about the current application state to aid development and debugging.

## Problem Statement

During alpha testing, users encounter bugs or have feature ideas but must switch context to report them (email, Discord, etc.). This friction reduces feedback quantity and quality. Additionally, manual reports often lack crucial context like:
- What cards were open
- Camera position and zoom level
- Recent actions that led to the issue
- Browser/device information

## Proposed Solution

Add a feedback button to the canvas UI that opens a modal for submitting bug reports or feature requests. The system automatically captures application state and stores submissions in Supabase for easy retrieval.

### Key Features

1. **Feedback Button** - Floating button in bottom-right corner (near existing help button pattern)
2. **Feedback Modal** - Simple form with type selector, description field, and optional screenshot
3. **Context Capture** - Automatic snapshot of canvas state, recent actions, and environment
4. **Supabase Storage** - Feedback table with RLS for user privacy
5. **Admin View** - Simple page to browse and filter feedback (future enhancement)

## Technical Approach

### 1. Database Schema

Create feedback table in Supabase:

```sql
-- Migration: create_feedback_table.sql
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  canvas_id text,
  type text not null check (type in ('bug', 'feature', 'other')),
  description text not null,
  context jsonb not null default '{}',
  screenshot_url text,
  created_at timestamptz default now(),
  status text default 'new' check (status in ('new', 'reviewed', 'resolved', 'wontfix'))
);

-- RLS: Users can insert their own feedback, only admins can read all
alter table public.feedback enable row level security;

create policy "Users can insert feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can view own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

-- Indexes for common queries
create index feedback_user_id_idx on public.feedback(user_id);
create index feedback_status_idx on public.feedback(status);
create index feedback_created_at_idx on public.feedback(created_at desc);

-- Note: Admin access will be via Supabase dashboard or service role key
-- No admin RLS policy needed for Phase 1
```

### 2. Context Capture

Capture relevant state using `$state.snapshot()`:

```typescript
// src/lib/utils/feedback-context.ts
interface FeedbackContext {
  // Canvas state
  cardCount: number;
  focusedCardId: string | null;
  editingCardId: string | null;
  activeChainIds: string[];
  cameraPosition: { x: number; y: number };
  zoomLevel: number;

  // Environment
  userAgent: string;
  screenSize: { width: number; height: number };
  timestamp: string;
  url: string;

  // Recent errors (if any)
  recentErrors: string[];
}

export function captureContext(canvasStore: CanvasStore): FeedbackContext {
  const snapshot = $state.snapshot(canvasStore);
  return {
    cardCount: snapshot.cards.size,
    focusedCardId: snapshot.focusedCardId,
    editingCardId: snapshot.editingCardId,
    activeChainIds: snapshot.activeChain,
    cameraPosition: snapshot.camera,
    zoomLevel: snapshot.zoom,
    userAgent: navigator.userAgent,
    screenSize: { width: window.innerWidth, height: window.innerHeight },
    timestamp: new Date().toISOString(),
    url: window.location.href,
    recentErrors: [] // TODO: Implement error tracking
  };
}
```

### 3. UI Components

#### Feedback Button
Add to canvas page, positioned in bottom-right near help indicator:

```svelte
<!-- In +page.svelte, near helpVisible toggle -->
<button
  class="feedback-btn"
  onclick={() => feedbackModalOpen = true}
  title="Send feedback"
>
  <MessageSquare size={20} />
</button>
```

#### Feedback Modal
Simple modal with form:

```svelte
<!-- src/lib/components/FeedbackModal.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import { canvasStore } from '$lib/stores/canvas.svelte';
  import { captureContext } from '$lib/utils/feedback-context';

  interface Props {
    open: boolean;
    onClose: () => void;
    canvasId: string;
  }

  let { open, onClose, canvasId }: Props = $props();
  let feedbackType = $state<'bug' | 'feature' | 'other'>('bug');
  let description = $state('');
  let submitting = $state(false);
</script>

{#if open}
  <div class="modal-backdrop" onclick={onClose}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <h2>Send Feedback</h2>

      <form
        method="POST"
        action="/api/feedback"
        use:enhance={() => {
          submitting = true;
          return async ({ result }) => {
            submitting = false;
            if (result.type === 'success') {
              onClose();
              description = '';
            }
          };
        }}
      >
        <input type="hidden" name="canvasId" value={canvasId} />
        <input type="hidden" name="context" value={JSON.stringify(captureContext(canvasStore))} />

        <fieldset>
          <legend>Type</legend>
          <label>
            <input type="radio" name="type" value="bug" bind:group={feedbackType} />
            Bug Report
          </label>
          <label>
            <input type="radio" name="type" value="feature" bind:group={feedbackType} />
            Feature Request
          </label>
          <label>
            <input type="radio" name="type" value="other" bind:group={feedbackType} />
            Other
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
            rows={5}
          />
        </label>

        <div class="actions">
          <button type="button" onclick={onClose}>Cancel</button>
          <button type="submit" disabled={submitting || !description.trim()}>
            {submitting ? 'Sending...' : 'Send Feedback'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
```

### 4. API Endpoint

```typescript
// src/routes/api/feedback/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.getSession();
  if (!session?.user) {
    throw error(401, 'Must be logged in to submit feedback');
  }

  const formData = await request.formData();
  const type = formData.get('type') as string;
  const description = formData.get('description') as string;
  const canvasId = formData.get('canvasId') as string;
  const context = JSON.parse(formData.get('context') as string || '{}');

  const { error: dbError } = await locals.supabase
    .from('feedback')
    .insert({
      user_id: session.user.id,
      canvas_id: canvasId,
      type,
      description,
      context
    });

  if (dbError) {
    console.error('Failed to save feedback:', dbError);
    throw error(500, 'Failed to save feedback');
  }

  return json({ success: true });
};
```

## Implementation Plan

### Phase 1: Core Feedback System
1. [ ] Create Supabase migration for feedback table
2. [ ] Implement `captureContext` utility function
3. [ ] Create FeedbackModal component
4. [ ] Add feedback button to canvas page
5. [ ] Create API endpoint for feedback submission
6. [ ] Test end-to-end flow

### Phase 2: Enhanced Context (Optional)
7. [ ] Add error tracking (capture console errors)
8. [ ] Add action history (recent user actions)
9. [ ] Add screenshot capture option

### Phase 3: Admin View (Future)
10. [ ] Create admin-only feedback list page
11. [ ] Add filtering by type, status, user
12. [ ] Add status update capability

## File Changes

| File | Change |
|------|--------|
| `supabase/migrations/XXXXXX_create_feedback.sql` | New migration |
| `src/lib/utils/feedback-context.ts` | New utility |
| `src/lib/components/FeedbackModal.svelte` | New component |
| `src/routes/canvas/[canvasId]/+page.svelte` | Add button + modal |
| `src/routes/api/feedback/+server.ts` | New API endpoint |

## Similar Code References

- **Modal pattern**: `src/routes/canvas/[canvasId]/+page.svelte` (helpVisible toggle)
- **API pattern**: `src/routes/api/notes/[noteId]/+server.ts`
- **Store access**: `src/lib/components/NoteCard.svelte` (canvasStore usage)
- **Form actions**: SvelteKit `use:enhance` pattern

## Design Decisions

### Context Capture Timing
Context is captured at **form submit time**, not when modal opens. This ensures the context reflects the state when the user decided to report, not when they opened the modal.

### Error Handling
- **Network/API errors**: Show inline error message in modal, keep modal open so user can retry
- **401 (unauthenticated)**: Button is hidden for non-logged-in users (prevents this case)
- **Validation errors**: Prevent submission with clear field-level feedback

### Success Feedback
On successful submission: close modal and show brief "Thanks for your feedback!" toast/notification.

### Validation Rules
- **Description**: 10-5000 characters, required
- **Type**: Must be 'bug', 'feature', or 'other' (validated server-side)
- **Rate limiting**: Not in Phase 1, but monitor for abuse

### Authentication
- Feedback button only visible to authenticated users
- No anonymous feedback (keeps it simple, tied to user for follow-up)

## Acceptance Criteria

1. Users can click a feedback button visible on the canvas
2. Modal opens with type selection and description field
3. Submitting captures current canvas state automatically
4. Feedback is stored in Supabase with user association
5. Users receive confirmation of successful submission (toast)
6. Errors show inline message in modal, allowing retry
7. Escape key closes the modal
8. Feedback button hidden for non-authenticated users

## Privacy Considerations

- Only capture application state, not note content
- User controls what description text is included
- RLS ensures users can only see their own feedback
- Context data is minimal and functional (no PII beyond user_id)

## Out of Scope (Future Enhancements)

- Screenshot capture (requires additional complexity)
- Action replay/history tracking
- Email notifications to admins
- Public feedback board
- Voting on feature requests
