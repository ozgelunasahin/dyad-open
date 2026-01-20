# Plan: Image Improvements

## Problem Statement

**User feedback:**
- "Image upload, fix" (mentioned with other requests)
- "I want to be able to add image to the main text and choose (simply) which one I want to have as cover image. Cover image should be optional."

Two related issues:
1. Image upload not working reliably
2. No way to set a cover image for the canvas

## Current Implementation

Need to investigate:
- How are images currently uploaded?
- Where are they stored?
- What's broken about the upload?

## Investigation Needed

### Questions to answer:
1. What image upload mechanism exists?
2. What errors occur when uploading?
3. Where are images stored (Supabase storage? External CDN?)
4. How does the Tiptap Image extension work in this codebase?

### Files to examine:
- `src/lib/tiptap/` - Check for image extension
- `src/routes/api/` - Check for upload endpoints
- `src/lib/components/TiptapEditor.svelte` - How images are handled

## Proposed Solution

### Part 1: Fix Image Upload

Depends on investigation. Common issues:
- Missing Supabase storage bucket
- CORS configuration
- File size limits
- Missing upload endpoint

### Part 2: Cover Image Selection

Add ability to designate one image as the cover:

**Option A: First image is cover**
- Automatically use first image in content as cover
- Simple, no UI changes needed

**Option B: Explicit cover selection**
- Add "Set as cover" button when clicking on an image
- Store `coverImageUrl` in canvas metadata
- More control but more UI complexity

**Recommendation:** Start with Option A (automatic), add Option B later if needed

### Cover Image Storage

```typescript
// In canvas table or separate field
interface Canvas {
  // existing fields...
  coverImageUrl?: string; // Set manually or extracted from content
}
```

### Cover Image Display

- Show on canvas card in dashboard
- Show in published site meta tags (og:image)
- Show in preview

## Implementation Steps

1. [ ] Investigate current image upload implementation
2. [ ] Identify and fix upload issues
3. [ ] Implement automatic cover image extraction
4. [ ] Add cover image to published site meta tags
5. [ ] (Optional) Add manual cover image selection UI

## Test Plan

1. [ ] Upload image in editor → appears correctly
2. [ ] Save note with image → persists after reload
3. [ ] First image becomes cover automatically
4. [ ] Cover appears in og:image meta tag
5. [ ] Cover appears in dashboard canvas list (if applicable)
