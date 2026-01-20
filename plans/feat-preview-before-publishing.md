# Plan: Preview Before Publishing

## Problem Statement

**User feedback (2 mentions):**
- "How about a way to preview before I publish? Text is centered and with links just like how a person visiting would see it"
- "Preview of canvas before publishing"

Users want to see exactly how their published site will look before making it public.

## Current Flow

1. User edits canvas in editor view
2. User clicks "Publish" in settings
3. Site goes live at `/sites/@username/canvas-slug`
4. User visits published URL to see result
5. If issues, must unpublish → edit → republish

No way to preview the published appearance without actually publishing.

## Proposed Solution

Add a "Preview" button/mode that renders the canvas exactly as it would appear when published.

### Option A: Preview Modal (Simpler)

- Add "Preview" button next to publish in settings
- Opens modal showing published view
- Same rendering as public site page
- Close modal to return to editing

### Option B: Preview Mode Toggle

- Toggle between "Edit" and "Preview" modes
- Preview mode shows full published layout inline
- More immersive but more complex

### Option C: Preview in New Tab

- "Preview" opens `/canvas/{id}/preview` in new tab
- Uses same renderer as published sites
- Simplest implementation, leverages existing code

**Recommendation:** Option C - reuse existing published site renderer

## Implementation Details

### Files to create/modify:
- `src/routes/canvas/[canvasId]/preview/+page.svelte` - NEW: Preview page
- `src/routes/canvas/[canvasId]/preview/+page.server.ts` - NEW: Data loader
- `src/lib/components/CanvasSettings.svelte` - Add preview button

### Preview Page

Reuse the published site renderer but:
- Only accessible to canvas owner
- Shows "Preview Mode" banner
- No SEO indexing

```svelte
<!-- preview/+page.svelte -->
<script>
  import PublishedSiteView from '$lib/components/PublishedSiteView.svelte';

  let { data } = $props();
</script>

<div class="preview-banner">
  Preview Mode - This is how your published site will look
  <a href="/canvas/{data.canvasId}">Return to Editor</a>
</div>

<PublishedSiteView canvas={data.canvas} notes={data.notes} />
```

### Add Preview Button

```svelte
<!-- In CanvasSettings.svelte -->
<button onclick={() => window.open(`/canvas/${canvasId}/preview`, '_blank')}>
  Preview
</button>
```

## Test Plan

1. [ ] Open canvas settings
2. [ ] Click "Preview" button
3. [ ] New tab opens with preview
4. [ ] Content matches published site appearance
5. [ ] Links work in preview
6. [ ] Only owner can access preview
7. [ ] Preview shows latest unsaved changes? (or only saved?)

## Questions to Clarify

- Should preview show unsaved changes or only saved content?
- Should preview require authentication (owner only)?
- Should preview be a separate route or modal?
