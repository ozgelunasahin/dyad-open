# Plan: Implement Open Todos (011-016)

**Created:** 2026-01-19
**Status:** Ready for implementation
**Complexity:** Medium (6 discrete features, mostly independent)

---

## Overview

Implement 6 pending todos to polish the dyad.berlin canvas application:

| ID | Priority | Feature | Complexity |
|----|----------|---------|------------|
| 011 | P1 | Consistent link following pan behavior | Medium |
| 012 | P2 | Remove landing page, show login directly | Low |
| 013 | P2 | Remove debug button (prod) and arrow buttons | Low |
| 014 | P2 | Help button + `?` keyboard shortcut | Medium |
| 015 | P1 | Password reset flow | Medium |
| 016 | P2 | Garamond font styling | Low |

---

## Phase 1: Quick Wins (Low Complexity)

### 1.1 Remove Landing Page (Todo 012)

**Problem:** Extra step before login. Root URL should redirect directly.

**Solution:** Update `/src/routes/+page.server.ts` to redirect:
- Authenticated users → `/dashboard`
- Unauthenticated users → `/login`

```typescript
// src/routes/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { session } = await locals.safeGetSession();

  if (session) {
    redirect(302, '/dashboard');
  } else {
    redirect(302, '/login');
  }
};
```

**Files to modify:**
- `src/routes/+page.server.ts` - Add redirect logic
- `src/routes/+page.svelte` - Can be deleted or left as fallback

**Acceptance Criteria:**
- [ ] Visiting `/` when logged out redirects to `/login`
- [ ] Visiting `/` when logged in redirects to `/dashboard`
- [ ] No landing page content shown

---

### 1.2 Remove Debug and Arrow Buttons (Todo 013)

**Problem:**
- Debug button visible in production
- Arrow buttons (back/forward) non-functional and cluttering UI

**Solution:**

1. Wrap debug toggle in dev check:
```svelte
<script>
  import { dev } from '$app/environment';
</script>

{#if dev}
  <button class="debug-toggle" ...>
{/if}
```

2. Remove arrow navigation buttons entirely (lines 350-383 in `+page.svelte`)

**Files to modify:**
- `src/routes/canvas/[canvasId]/+page.svelte`
  - Line ~449: Wrap debug toggle in `{#if dev}`
  - Lines ~350-383: Delete arrow button markup

**Acceptance Criteria:**
- [ ] Debug toggle button hidden in production build
- [ ] Debug toggle visible when running `npm run dev`
- [ ] Arrow buttons completely removed from UI
- [ ] Back/forward keyboard shortcuts (Alt+Arrow) still work

---

### 1.3 Garamond Font Styling (Todo 016)

**Problem:** Need consistent typography using EB Garamond, inspired by trydyad.app.

**Solution:**

1. Add EB Garamond via Google Fonts in `src/app.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
```

2. Update `src/app.css`:
```css
:root {
  /* Typography */
  --font-serif: 'EB Garamond', Georgia, 'Times New Roman', serif;
}

body {
  font-family: var(--font-serif);
  line-height: 1.6;
}

/* Preserve monospace for code */
code, pre, kbd {
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
}
```

3. Update `src/lib/components/NoteCard.svelte` (line ~347):
```css
.text-block {
  font-family: var(--font-serif);
}
```

**Design inspiration from trydyad.app:**
- Primary blue: `#163764`
- Text secondary: `#6b7280`
- Clean, minimal aesthetic
- Generous line-height (1.6)

**Files to modify:**
- `src/app.html` - Add Google Fonts preconnect and stylesheet
- `src/app.css` - Update font-family, add line-height
- `src/lib/components/NoteCard.svelte` - Use CSS variable

**Acceptance Criteria:**
- [ ] Body text renders in EB Garamond
- [ ] Headings render in EB Garamond
- [ ] Code blocks remain monospace
- [ ] Font loads without blocking page render (font-display: swap)
- [ ] Fallback to Georgia if font fails to load

---

## Phase 2: Medium Complexity Features

### 2.1 Consistent Link Pan Behavior (Todo 011)

**Problem:** Clicking a wikilink always triggers full pan animation, even when target card is already visible. This differs from the "focus + click" behavior which uses conservative panning.

**Current behavior:**
- `handleLinkClick()` → `followLinkToRight()` → `focusCard()` → Always animates

**Desired behavior:**
- Link click should use same conservative panning as `focusCard()`:
  - Fully visible → No pan
  - Partially visible → Minimal pan
  - Off-screen → Full pan animation

**Solution:**

The `focusCard()` method already has visibility-based panning logic (lines 587-707 in canvas.svelte.ts). The issue is that `followLinkToRight()` doesn't distinguish between new cards and existing visible cards.

Update `followLinkToRight()` to leverage existing conservative panning:

```typescript
// In canvas.svelte.ts, followLinkToRight() around line 1117
followLinkToRight(
  noteId: string,
  fromCardId: string,
  sourceBounds: SourceBounds,
  linkSide?: LinkSide
): boolean {
  // ... existing chain restoration logic ...

  // If note is already open, use conservative focus (existing code path is fine)
  if (this.cards.has(noteId)) {
    // focusCard() already handles visibility-based panning
    this.focusCard(noteId);
    return true;
  }

  // For NEW cards, focusCard() will use forceAnimation since card wasn't visible
  // This is correct - new cards should animate into view
  // ... rest of card creation logic ...
}
```

The key insight: `focusCard()` already implements conservative panning correctly. The issue may be in how `forceAnimation` is being passed or how visibility is calculated for newly-created cards.

**Investigation needed:**
1. Check if `getCardVisibility()` returns correct state for cards that were just created
2. Ensure `focusCard()` is called AFTER card is added to `this.cards`

**Files to modify:**
- `src/lib/stores/canvas.svelte.ts` - Review `followLinkToRight()` and `focusCard()` interaction

**Acceptance Criteria:**
- [ ] Clicking link to visible card does not pan
- [ ] Clicking link to partially visible card does minimal pan
- [ ] Clicking link to off-screen card does full pan
- [ ] Clicking link to unopened card opens and pans to it
- [ ] Keyboard link following (Tab + Enter) behaves same as click

---

### 2.2 Help Keyboard Shortcuts (Todo 014)

**Problem:** Users have no way to discover keyboard shortcuts.

**Solution:**
- Press `?` to toggle help bar at bottom of screen
- Non-modal, doesn't block canvas interaction
- Shows essential shortcuts in a single row

**Implementation:**

1. Add state and keyboard handler in `+page.svelte`:
```svelte
<script>
  let showHelp = $state(false);

  function handleGlobalKeydown(e: KeyboardEvent) {
    // Ignore if typing in input
    if (e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable) {
      return;
    }

    // Ignore if editing a card
    if (canvasStore.editingCardId) return;

    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      showHelp = !showHelp;
    }

    if (e.key === 'Escape' && showHelp) {
      showHelp = false;
    }
  }
</script>

<svelte:window on:keydown={handleGlobalKeydown} />
```

2. Create help bar component or inline:
```svelte
{#if showHelp}
  <div class="help-bar">
    <span><kbd>↑</kbd><kbd>↓</kbd> Scroll</span>
    <span><kbd>←</kbd><kbd>→</kbd> Navigate</span>
    <span><kbd>Tab</kbd> Links</span>
    <span><kbd>e</kbd> Edit</span>
    <span><kbd>Delete</kbd> Close</span>
    <span><kbd>⌘</kbd><kbd>+</kbd><kbd>-</kbd> Zoom</span>
    <span><kbd>?</kbd> Toggle help</span>
  </div>
{/if}

<style>
  .help-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 2rem;
    padding: 0.75rem 1rem;
    background: rgba(26, 26, 26, 0.95);
    color: #888;
    font-size: 0.8rem;
    z-index: 100;
  }

  .help-bar span {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .help-bar kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    padding: 0.125rem 0.375rem;
    background: #333;
    border: 1px solid #444;
    border-radius: 3px;
    font-family: inherit;
    font-size: 0.7rem;
  }
</style>
```

**Files to modify:**
- `src/routes/canvas/[canvasId]/+page.svelte` - Add help bar and keyboard handler

**Acceptance Criteria:**
- [ ] Pressing `?` toggles help bar visibility
- [ ] Help bar shows at bottom of screen
- [ ] Help bar doesn't block canvas interaction
- [ ] Pressing `?` while editing inserts `?` into text (no toggle)
- [ ] Pressing `Escape` closes help bar
- [ ] Help bar shows 6-8 essential shortcuts

---

### 2.3 Password Reset Flow (Todo 015)

**Problem:** Users cannot reset forgotten passwords.

**Solution:** Implement Supabase password reset flow:

1. Add "Forgot password?" link and reset mode to login page
2. Handle password reset email request
3. Update auth callback to detect recovery tokens
4. Create update password page

**Implementation:**

#### Step 1: Update Login Page

Add reset mode to `/src/routes/login/+page.svelte`:

```svelte
<script lang="ts">
  let mode = $state<'login' | 'signup' | 'reset'>('login');
</script>

{#if mode === 'reset'}
  <h1>Reset Password</h1>
  <form method="POST" action="?/resetPassword" use:enhance>
    <div class="form-group">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required />
    </div>
    <button type="submit">Send Reset Link</button>
  </form>
  <p>
    Remember your password?
    <button type="button" class="link-btn" onclick={() => mode = 'login'}>
      Sign in
    </button>
  </p>
{:else}
  <!-- existing login/signup form -->
  {#if mode === 'login'}
    <p class="forgot-password">
      <button type="button" class="link-btn" onclick={() => mode = 'reset'}>
        Forgot password?
      </button>
    </p>
  {/if}
{/if}
```

#### Step 2: Add Server Action

Add to `/src/routes/login/+page.server.ts`:

```typescript
resetPassword: async ({ request, locals, url }) => {
  const data = await request.formData();
  const email = data.get('email');

  if (typeof email !== 'string' || !email) {
    return fail(400, { error: 'Please enter your email' });
  }

  const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${url.origin}/auth/callback?next=/auth/update-password`
  });

  if (error) {
    return fail(400, { error: error.message });
  }

  return { success: true, message: 'Check your email for a reset link' };
}
```

#### Step 3: Update Auth Callback

Update `/src/routes/auth/callback/+server.ts`:

```typescript
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(303, next);
    }
  }

  // Fallback to dashboard
  redirect(303, '/dashboard');
};
```

#### Step 4: Create Update Password Page

Create `/src/routes/auth/update-password/+page.svelte`:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
  let loading = $state(false);
</script>

<div class="auth-container">
  <div class="auth-card">
    <h1>Set New Password</h1>

    {#if form?.error}
      <div class="error-message">{form.error}</div>
    {/if}

    <form method="POST" use:enhance={() => {
      loading = true;
      return async ({ update }) => {
        loading = false;
        await update();
      };
    }}>
      <div class="form-group">
        <label for="password">New Password</label>
        <input type="password" id="password" name="password" required minlength="6" />
        <p class="hint">At least 6 characters</p>
      </div>

      <button type="submit" class="submit-btn" disabled={loading}>
        {loading ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  </div>
</div>
```

Create `/src/routes/auth/update-password/+page.server.ts`:

```typescript
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { session } = await locals.safeGetSession();

  // Must be authenticated via recovery link
  if (!session) {
    redirect(303, '/login');
  }
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const password = data.get('password');

    if (typeof password !== 'string' || password.length < 6) {
      return fail(400, { error: 'Password must be at least 6 characters' });
    }

    const { error } = await locals.supabase.auth.updateUser({ password });

    if (error) {
      return fail(400, { error: error.message });
    }

    redirect(303, '/dashboard');
  }
};
```

**Files to create/modify:**
- `src/routes/login/+page.svelte` - Add reset mode and forgot password link
- `src/routes/login/+page.server.ts` - Add resetPassword action
- `src/routes/auth/callback/+server.ts` - Handle `next` query param
- `src/routes/auth/update-password/+page.svelte` (new)
- `src/routes/auth/update-password/+page.server.ts` (new)

**Supabase Configuration Required:**
Add to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
```
https://dyad-canvas.pages.dev/auth/callback
```

**Acceptance Criteria:**
- [ ] "Forgot password?" link visible on login page
- [ ] Clicking link shows email input form
- [ ] Submitting email sends reset email (success message shown)
- [ ] Clicking email link redirects to update password page
- [ ] Entering new password updates it and redirects to dashboard
- [ ] Invalid/expired tokens show error message
- [ ] Password requirements enforced (min 6 chars)

---

## Implementation Order

Recommended order based on dependencies and quick wins:

1. **Remove landing page** (012) - 10 min, no dependencies
2. **Remove debug/arrow buttons** (013) - 10 min, no dependencies
3. **Garamond styling** (016) - 20 min, no dependencies
4. **Password reset flow** (015) - 45 min, needs Supabase config
5. **Help keyboard shortcuts** (014) - 30 min, benefits from 013 (space freed)
6. **Consistent link pan** (011) - 30 min, investigation needed

**Total estimated effort:** ~2-3 hours

---

## Testing Checklist

### Before Deployment
- [ ] Test landing page redirect (logged in and out)
- [ ] Test debug toggle visibility in dev vs prod build
- [ ] Test font loading (slow network, font failure)
- [ ] Test password reset full flow
- [ ] Test help bar toggle in various states
- [ ] Test link pan behavior with visible/hidden cards

### Post-Deployment
- [ ] Verify Supabase redirect URLs are configured
- [ ] Verify fonts load from Google CDN
- [ ] Test password reset email delivery
- [ ] Check Cloudflare caching for fonts

---

## References

### Files to Modify
- `src/routes/+page.server.ts` - Landing redirect
- `src/routes/canvas/[canvasId]/+page.svelte` - Debug buttons, help bar
- `src/routes/login/+page.svelte` - Password reset mode
- `src/routes/login/+page.server.ts` - Reset password action
- `src/routes/auth/callback/+server.ts` - Handle next param
- `src/routes/auth/update-password/` - New route (2 files)
- `src/app.html` - Font loading
- `src/app.css` - Typography
- `src/lib/components/NoteCard.svelte` - Font family
- `src/lib/stores/canvas.svelte.ts` - Pan behavior (investigation)

### External Documentation
- [Supabase Password Reset](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [SvelteKit Redirects](https://kit.svelte.dev/docs/load#redirects)
- [EB Garamond on Google Fonts](https://fonts.google.com/specimen/EB+Garamond)
- [$app/environment](https://kit.svelte.dev/docs/modules#$app-environment)
