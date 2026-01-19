# feat: Paste Images Into Cards

## Overview

Enable users to paste images from their clipboard directly into note cards. Images are uploaded to local storage and referenced via URL in the editor content.

## Problem Statement

Currently, dyad.berlin notes are text-only. Users cannot include screenshots, diagrams, or photos in their notes, limiting the expressiveness of the note-taking experience.

## Proposed Solution

Paste → Upload to `/api/upload` → Store in `static/uploads/` → Insert image node

1. Install `@tiptap/extension-image`
2. Create upload API route
3. Add paste handler to TiptapEditor
4. Update content validation whitelist

## Implementation

### 1. Install Dependency

```bash
npm install @tiptap/extension-image
```

### 2. Upload API Route

`src/routes/api/upload/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';

const UPLOAD_DIR = 'static/uploads';
const MAX_SIZE = 5 * 1024 * 1024;

// Derive extension from MIME type (not user-provided filename)
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

interface UploadSuccessResponse {
  url: string;
}

interface UploadErrorResponse {
  error: string;
}

export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return json({ error: 'No file provided' } satisfies UploadErrorResponse, { status: 400 });
  }

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return json({ error: 'Invalid file type' } satisfies UploadErrorResponse, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return json({ error: 'File too large (max 5MB)' } satisfies UploadErrorResponse, { status: 400 });
  }

  const filename = `${nanoid()}.${ext}`;

  try {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);

    return json({ url: `/uploads/${filename}` } satisfies UploadSuccessResponse);
  } catch (err) {
    console.error('Failed to write uploaded file:', err);
    return json({ error: 'Failed to save file' } satisfies UploadErrorResponse, { status: 500 });
  }
};
```

### 3. Update Content Validation

`src/routes/api/notes/[slug]/+server.ts`

Add `'image'` to `ALLOWED_NODE_TYPES` (line ~44):

```typescript
const ALLOWED_NODE_TYPES = new Set([
  // ... existing types ...
  'image'
]);
```

Update attribute validation to allow `src` only on image nodes (around line ~122):

```typescript
// Inside validateJSONContent, replace the dangerous attrs check:
if (n.attrs !== undefined) {
  if (typeof n.attrs !== 'object' || n.attrs === null) {
    return 'Node attrs must be an object';
  }

  const attrs = n.attrs as Record<string, unknown>;

  if (n.type === 'image') {
    // Allow only safe attributes for images
    const allowedImageAttrs = ['src', 'alt', 'title'];
    for (const key of Object.keys(attrs)) {
      if (!allowedImageAttrs.includes(key)) {
        return `Invalid image attribute: "${key}"`;
      }
    }
    // Validate src is a local upload path
    if (typeof attrs.src === 'string' && !attrs.src.startsWith('/uploads/')) {
      return 'Image src must be a local upload path';
    }
  } else {
    // Block dangerous attributes on non-image nodes
    const dangerousAttrs = ['onclick', 'onerror', 'onload', 'onmouseover', 'href', 'src'];
    for (const key of Object.keys(attrs)) {
      if (dangerousAttrs.includes(key.toLowerCase())) {
        return `Forbidden attribute: "${key}"`;
      }
    }
  }
}
```

### 4. Editor Integration

`src/lib/components/TiptapEditor.svelte`

Add import and extension:

```typescript
import Image from '@tiptap/extension-image';
import type { EditorView } from '@tiptap/pm/view';

// In editor initialization, add Image to extensions array:
extensions: [
  StarterKit.configure({ /* ... */ }),
  Wikilink.configure({ /* ... */ }),
  Image,
],

// Add paste handler in editorProps:
editorProps: {
  attributes: { /* existing */ },
  handleClick: (view, pos, event) => { /* existing */ },

  handlePaste(view: EditorView, event: ClipboardEvent): boolean {
    if (!view.editable) return false;

    const files = event.clipboardData?.files;
    if (!files?.length) return false;

    const imageFile = Array.from(files).find(f =>
      f.type === 'image/jpeg' || f.type === 'image/png'
    );
    if (!imageFile) return false;

    event.preventDefault();

    const formData = new FormData();
    formData.append('file', imageFile);

    fetch('/api/upload', { method: 'POST', body: formData })
      .then(r => r.json())
      .then(data => {
        if (data.url) {
          const { state, dispatch } = view;
          const node = state.schema.nodes.image.create({ src: data.url });
          dispatch(state.tr.replaceSelectionWith(node));
        } else if (data.error) {
          console.error('Upload failed:', data.error);
        }
      })
      .catch(console.error);

    return true;
  },
}
```

Add CSS for images:

```css
:global(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 0.5em 0;
}
```

### 5. Git Configuration

Add to `.gitignore`:

```
static/uploads/*
!static/uploads/.gitkeep
```

## Acceptance Criteria

- [ ] User can paste JPEG/PNG image from clipboard into editing card
- [ ] Image is uploaded and stored in `static/uploads/`
- [ ] Image displays in editor at max card width
- [ ] Image persists in saved content
- [ ] Files > 5MB are rejected
- [ ] Only JPEG and PNG are accepted
- [ ] Paste is ignored in read-only mode

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `@tiptap/extension-image` |
| `src/routes/api/upload/+server.ts` | Create | Upload endpoint |
| `src/routes/api/notes/[slug]/+server.ts` | Modify | Add 'image' to whitelist, validate src |
| `src/lib/components/TiptapEditor.svelte` | Modify | Add Image extension and paste handler |
| `.gitignore` | Modify | Ignore uploads directory |

## Future Enhancements (not in scope)

- GIF/WebP support
- Drag and drop
- Image resizing
- Alt text UI
- Upload progress indicator
- Cloud storage backend

## References

- [Tiptap Image Extension](https://tiptap.dev/docs/editor/extensions/nodes/image)
- `src/lib/components/TiptapEditor.svelte` - Editor component
- `src/routes/api/notes/[slug]/+server.ts:44-58` - Content validation
