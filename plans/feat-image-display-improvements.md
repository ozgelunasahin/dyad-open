# ✨ feat: Image Display Improvements (Center & Shrink to Fit)

## Overview

Improve how images are displayed in note cards by ensuring they are centered and properly sized to fit within the card width. Currently images paste correctly but lack polish in their display.

## Problem Statement

User feedback indicates images pasted into cards need better display handling:
- Images are left-aligned instead of centered
- Large images shrink correctly but small images look awkward
- No visual feedback during upload or on errors

**Current behavior:**
- Images use `max-width: 100%; height: auto;` - shrinks large images ✓
- Images left-aligned (inherit text alignment)
- No upload progress indicator
- Silent failures on upload errors

## Proposed Solution

### Phase 1: CSS Improvements (Minimal)

Update image styling to center images and ensure consistent display:

```css
/* src/lib/components/TiptapEditor.svelte */
.tiptap-editor :global(img) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 1em auto;  /* Center horizontally */
    border-radius: 4px;
}

/* Small images should also be centered */
.tiptap-editor :global(img[width]) {
    max-width: min(100%, attr(width px));
}
```

**Files to modify:**
- `src/lib/components/TiptapEditor.svelte:342-348`

### Phase 2: Upload UX Improvements (Recommended)

Add visual feedback for upload progress and errors.

#### Upload Progress

```typescript
// src/lib/components/TiptapEditor.svelte - handlePaste
handlePaste(view: EditorView, event: ClipboardEvent): boolean {
    // ... existing validation ...

    // Create placeholder while uploading
    const placeholder = createUploadPlaceholder();
    const { state, dispatch } = view;
    dispatch(state.tr.replaceSelectionWith(placeholder));

    fetch('/api/upload', { method: 'POST', body: formData })
        .then((r) => r.json())
        .then((data) => {
            if (data.url) {
                // Replace placeholder with actual image
                replaceNodeWithImage(view, placeholder, data.url);
            } else {
                // Show error state
                showUploadError(data.error);
                removePlaceholder(view, placeholder);
            }
        })
        .catch((err) => {
            showUploadError('Network error');
            removePlaceholder(view, placeholder);
        });

    return true;
}
```

#### Error Toast

Use existing feedback mechanism or simple toast:

```typescript
function showUploadError(message: string) {
    // Could use existing toast system or simple alert
    console.error('Upload failed:', message);
    // TODO: Integrate with app's notification system
}
```

**Files to modify:**
- `src/lib/components/TiptapEditor.svelte:90-120`

### Phase 3: File Type Alignment (Bug Fix)

Fix mismatch between client and server file type support:

**Current state:**
- TipTap paste handler: JPEG, PNG only
- Upload endpoint: JPEG, PNG, WebP, GIF

**Solution:** Update paste handler to match server:

```typescript
// src/lib/components/TiptapEditor.svelte:96-98
const imageFile = Array.from(files).find(
    (f) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)
);
```

**Files to modify:**
- `src/lib/components/TiptapEditor.svelte:96-98`

## Technical Considerations

### Card Height & Layout

- Images can make cards very tall (portrait screenshots)
- ResizeObserver already handles dynamic height changes
- No max-height needed for MVP - let content flow naturally
- Future consideration: click-to-expand for very tall images

### Performance

- Images already use `loading="lazy"` can be added via HTMLAttributes
- Current 5MB limit is reasonable
- Future: server-side image optimization/compression

### Accessibility

- Current: No alt text UI
- Future: Add alt text prompt or context menu to edit

## Acceptance Criteria

### Phase 1 (CSS)
- [ ] Images are horizontally centered within cards
- [ ] Large images shrink to fit card width
- [ ] Small images display at native size, centered
- [ ] Images have consistent vertical margin (1em)

### Phase 2 (UX)
- [ ] Upload shows visual indicator while in progress
- [ ] Failed uploads show error message to user
- [ ] Network errors are handled gracefully

### Phase 3 (Bug Fix)
- [ ] WebP images can be pasted
- [ ] GIF images can be pasted (if desired)
- [ ] File type validation consistent between client and server

## Out of Scope

- Drag-and-drop image upload (conflicts with canvas panning)
- Image resizing UI (handles, size presets)
- Alt text editing UI
- Server-side image optimization
- Image gallery/lightbox view

## Success Metrics

- Images display centered in all cards
- No silent upload failures
- Consistent file type support

## References

### Internal
- `src/lib/components/TiptapEditor.svelte:90-120` - Paste handler
- `src/lib/components/TiptapEditor.svelte:342-348` - Image CSS
- `src/routes/api/upload/+server.ts` - Upload endpoint

### External
- [TipTap Image Extension](https://tiptap.dev/docs/editor/extensions/nodes/image)
- [TipTap FileHandler Extension](https://tiptap.dev/docs/editor/extensions/functionality/filehandler)

## Implementation Notes

### Simplest Path (Phase 1 Only)

If only CSS changes are needed:

1. Update `TiptapEditor.svelte` image styles
2. Test with various image sizes
3. Done

```css
.tiptap-editor :global(img) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 1em auto;
    border-radius: 4px;
}
```

This single change achieves "center and shrink to fit" with minimal code.
