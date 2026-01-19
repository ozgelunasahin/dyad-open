# Fix: Canvas Publishing URL Issues

## Overview

Testing revealed that while the core publishing infrastructure exists and works, the **UI shows incorrect URLs** that would confuse users trying to share their published canvases.

## Issues Found

### 1. Public URL Display Shows Wrong Format

**Location:** `src/routes/canvas/[canvasId]/+page.svelte:309`

**Current behavior:**
```svelte
<code>/{data.canvas.slug}</code>
```
Shows: `/getting-started`

**Expected:** `/{username}/getting-started` (the actual public route)

### 2. Copy Button Copies Wrong URL

**Location:** `src/routes/canvas/[canvasId]/+page.svelte:142-145`

**Current behavior:**
```typescript
function copyPublicUrl() {
  const url = `${window.location.origin}/canvas/${data.canvas.id}`;
  navigator.clipboard.writeText(url);
}
```
Copies: `https://dyad.berlin/canvas/_h3JUuYWkoBWihHGWBHck` (private, requires auth)

**Expected:** `https://dyad.berlin/{username}/getting-started` (public, human-readable)

### 3. Username Not Available in Canvas Page

**Location:** `src/routes/canvas/[canvasId]/+page.server.ts`

The server load function doesn't fetch the user's profile username, which is needed to construct the public URL.

## Proposed Solution

### Phase 1: Add Username to Canvas Page Data

**File:** `src/routes/canvas/[canvasId]/+page.server.ts`

```typescript
// Add profile fetch to the load function
const { data: profile } = await locals.supabase
  .from('profiles')
  .select('username')
  .eq('id', locals.user.id)
  .single();

return {
  user: locals.user,
  profile: { username: profile?.username },
  canvas,
  cardPositions,
  vault
};
```

### Phase 2: Fix Public URL Display

**File:** `src/routes/canvas/[canvasId]/+page.svelte`

```svelte
<div class="setting-group">
  <label>Public URL</label>
  <div class="url-display">
    <code>/{data.profile.username}/{data.canvas.slug}</code>
    {#if data.canvas.is_published}
      <button class="copy-btn" onclick={copyPublicUrl}>Copy</button>
    {/if}
  </div>
</div>
```

### Phase 3: Fix Copy Function

**File:** `src/routes/canvas/[canvasId]/+page.svelte`

```typescript
function copyPublicUrl() {
  const url = `${window.location.origin}/${data.profile.username}/${data.canvas.slug}`;
  navigator.clipboard.writeText(url);
}
```

## Acceptance Criteria

- [ ] Settings panel shows full public URL: `/{username}/{slug}`
- [ ] Copy button copies the correct public URL
- [ ] Public URL actually works when visited (returns canvas in read-only mode)
- [ ] Unpublished canvases show the URL but indicate it won't work until published

## Testing

1. Log in as test user
2. Open a canvas and go to settings
3. Verify URL shows `/{username}/{slug}` format
4. Publish the canvas
5. Click "Copy" and verify correct URL is copied
6. Visit the copied URL in incognito - should see read-only canvas
7. Unpublish and verify URL no longer works for public

## References

- Public route: `src/routes/[username]/[canvasSlug]/+page.server.ts`
- Canvas settings UI: `src/routes/canvas/[canvasId]/+page.svelte:306-331`
- Database schema: `supabase-setup.sql` (profiles table with username)
