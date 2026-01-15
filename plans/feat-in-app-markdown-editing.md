# feat: In-App Markdown Editing with File Sync

## Overview

Implement inline editing of note cards that syncs changes back to the source markdown files. Users can click on card content to enter edit mode, use markdown hotkeys (Cmd+B, Cmd+I, [[), and changes auto-save to disk.

## Problem Statement

Currently, the app is read-only. To edit content, users must:
1. Find the markdown file in `content/notes/`
2. Edit in an external editor
3. Wait for hot reload to see changes

This breaks the reading flow and requires context switching. Users should be able to edit content directly in the spatial canvas.

## Proposed Solution

Add an edit mode to NoteCard that:
1. **Click to edit**: Clicking on card content (not wikilinks) enters edit mode
2. **Textarea replacement**: Replace rendered markdown with a textarea showing raw markdown
3. **Markdown hotkeys**: Cmd+B (bold), Cmd+I (italic), [[ (wikilink with autocomplete)
4. **Auto-save**: Debounced save (1.5s) via API endpoint to markdown files
5. **Hot reload integration**: Suppress reload while editing, apply after exit

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         NoteCard.svelte                          │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │   View Mode     │ ←→ │           Edit Mode                 │ │
│  │  (rendered HTML)│    │  (textarea + markdown-shortcuts.ts) │ │
│  └─────────────────┘    └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ PUT /api/notes/[slug]
┌─────────────────────────────────────────────────────────────────┐
│                    +server.ts (API Route)                        │
│   - Validate slug                                                │
│   - Write to content/notes/{slug}.md                            │
│   - Return success/error                                        │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ File system change detected
┌─────────────────────────────────────────────────────────────────┐
│                    vite.config.ts (Hot Reload)                   │
│   - Check if edit mode active → suppress reload                 │
│   - Rebuild vault when edit mode exits                          │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Edit trigger | Click on content | Hover for visual cue, click to edit (standard pattern) |
| Editor type | Textarea | Simpler than contenteditable, native undo/redo, no XSS |
| Single edit mode | Yes | Only one card editable at a time (reduces complexity) |
| Save mechanism | Debounced auto-save | 1.5s after last keystroke, visual indicator |
| Hot reload | Suppressed during edit | Prevent content replacement mid-edit |

---

## Implementation Phases

### Phase 1: Edit Mode Foundation

**Files to create:**

| File | Purpose |
|------|---------|
| `src/lib/utils/markdown-shortcuts.ts` | Bold, italic, wikilink text manipulation |
| `src/routes/api/notes/[slug]/+server.ts` | PUT endpoint for saving markdown files |

**Files to modify:**

| File | Changes |
|------|---------|
| `src/lib/components/NoteCard.svelte` | Add edit mode state, toggle view/edit |
| `src/lib/stores/canvas.svelte.ts` | Add `editingCardId` state |
| `vite.config.ts` | Suppress hot reload during edit |

#### markdown-shortcuts.ts

```typescript
// src/lib/utils/markdown-shortcuts.ts

export function wrapSelection(
  textarea: HTMLTextAreaElement,
  wrapper: string,
  endWrapper?: string
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);
  const wrap = endWrapper ?? wrapper;

  // Toggle: if already wrapped, unwrap
  const before = text.substring(start - wrapper.length, start);
  const after = text.substring(end, end + wrap.length);

  if (before === wrapper && after === wrap) {
    textarea.value =
      text.substring(0, start - wrapper.length) +
      selected +
      text.substring(end + wrap.length);
    textarea.setSelectionRange(start - wrapper.length, end - wrapper.length);
  } else {
    textarea.value =
      text.substring(0, start) + wrapper + selected + wrap + text.substring(end);
    textarea.setSelectionRange(start + wrapper.length, end + wrapper.length);
  }

  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
}

export function toggleBold(textarea: HTMLTextAreaElement): void {
  wrapSelection(textarea, '**');
}

export function toggleItalic(textarea: HTMLTextAreaElement): void {
  wrapSelection(textarea, '*');
}

export function insertWikilink(textarea: HTMLTextAreaElement): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);

  if (selected) {
    wrapSelection(textarea, '[[', ']]');
  } else {
    // Insert empty wikilink and position cursor inside
    textarea.value = text.substring(0, start) + '[[]]' + text.substring(end);
    textarea.setSelectionRange(start + 2, start + 2);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }
}
```

#### API Route

```typescript
// src/routes/api/notes/[slug]/+server.ts

import { json } from '@sveltejs/kit';
import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RequestHandler } from './$types';

const NOTES_DIR = './content/notes';

// Validate slug to prevent path traversal
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && !slug.includes('..');
}

export const PUT: RequestHandler = async ({ params, request }) => {
  const { slug } = params;

  if (!isValidSlug(slug)) {
    return json({ error: 'Invalid slug' }, { status: 400 });
  }

  const { content } = await request.json();

  if (typeof content !== 'string') {
    return json({ error: 'Content must be a string' }, { status: 400 });
  }

  const filePath = join(NOTES_DIR, `${slug}.md`);

  try {
    await writeFile(filePath, content, 'utf-8');
    return json({ success: true, saved: new Date().toISOString() });
  } catch (error) {
    console.error(`[API] Failed to save ${slug}:`, error);
    return json({ error: 'Failed to save file' }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ params }) => {
  const { slug } = params;

  if (!isValidSlug(slug)) {
    return json({ error: 'Invalid slug' }, { status: 400 });
  }

  const filePath = join(NOTES_DIR, `${slug}.md`);

  try {
    const content = await readFile(filePath, 'utf-8');
    return json({ content });
  } catch {
    return json({ error: 'File not found' }, { status: 404 });
  }
};
```

### Phase 2: NoteCard Edit Mode

**Modify `src/lib/components/NoteCard.svelte`:**

```svelte
<script lang="ts">
  import { tick } from 'svelte';
  import type { Card, Point } from '$lib/types';
  import { parseMarkdown } from '$lib/utils/markdown';
  import { canvasStore } from '$lib/stores/canvas.svelte';
  import { toggleBold, toggleItalic, insertWikilink } from '$lib/utils/markdown-shortcuts';

  interface Props {
    card: Card;
    isActive: boolean;
    onLinkClick: (noteId: string, cardId: string, position: Point) => void;
  }

  let { card, isActive, onLinkClick }: Props = $props();

  // Edit state
  let isEditing = $derived(canvasStore.editingCardId === card.id);
  let editContent = $state('');
  let textareaRef: HTMLTextAreaElement;
  let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
  let debounceTimer: ReturnType<typeof setTimeout>;
  let lastKey = '';

  // Rendered HTML for view mode
  let html = $derived(parseMarkdown(card.note.content));

  // Enter edit mode
  async function enterEditMode() {
    if (canvasStore.editingCardId && canvasStore.editingCardId !== card.id) {
      // Another card is being edited - exit that first
      canvasStore.exitEditMode();
    }

    // Load raw content (with frontmatter)
    try {
      const res = await fetch(`/api/notes/${card.note.id}`);
      if (res.ok) {
        const data = await res.json();
        editContent = data.content;
      } else {
        // Fallback to note content without frontmatter
        editContent = `---\ntitle: "${card.note.title}"\n---\n\n${card.note.content}`;
      }
    } catch {
      editContent = `---\ntitle: "${card.note.title}"\n---\n\n${card.note.content}`;
    }

    canvasStore.enterEditMode(card.id);

    await tick();
    textareaRef?.focus();
  }

  // Exit edit mode
  function exitEditMode() {
    clearTimeout(debounceTimer);
    if (saveStatus === 'saving') {
      // Wait for save to complete
      return;
    }
    canvasStore.exitEditMode();
  }

  // Handle click on card content
  function handleContentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Don't enter edit mode if clicking a wikilink
    if (target.classList.contains('wikilink')) {
      return;
    }

    if (!isEditing) {
      enterEditMode();
    }
  }

  // Handle keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    const isMod = event.metaKey || event.ctrlKey;

    // Cmd+B = Bold
    if (isMod && event.key === 'b') {
      event.preventDefault();
      toggleBold(textareaRef);
      return;
    }

    // Cmd+I = Italic
    if (isMod && event.key === 'i') {
      event.preventDefault();
      toggleItalic(textareaRef);
      return;
    }

    // Cmd+S = Force save
    if (isMod && event.key === 's') {
      event.preventDefault();
      saveNow();
      return;
    }

    // Escape = Exit edit mode
    if (event.key === 'Escape') {
      event.preventDefault();
      exitEditMode();
      return;
    }

    // [[ = Insert wikilink
    if (event.key === '[' && lastKey === '[') {
      event.preventDefault();
      // Remove the first [ that was typed
      const pos = textareaRef.selectionStart;
      textareaRef.value =
        textareaRef.value.substring(0, pos - 1) +
        textareaRef.value.substring(pos);
      textareaRef.setSelectionRange(pos - 1, pos - 1);
      insertWikilink(textareaRef);
      lastKey = '';
      return;
    }

    lastKey = event.key;
  }

  // Handle input changes
  function handleInput() {
    editContent = textareaRef.value;
    scheduleSave();
  }

  // Debounced save
  function scheduleSave() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveNow, 1500);
  }

  // Immediate save
  async function saveNow() {
    if (!editContent) return;

    saveStatus = 'saving';

    try {
      const res = await fetch(`/api/notes/${card.note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      });

      if (res.ok) {
        saveStatus = 'saved';
        setTimeout(() => {
          if (saveStatus === 'saved') saveStatus = 'idle';
        }, 2000);
      } else {
        saveStatus = 'error';
      }
    } catch {
      saveStatus = 'error';
    }
  }

  // Cleanup on unmount
  $effect(() => {
    return () => {
      clearTimeout(debounceTimer);
    };
  });
</script>
```

### Phase 3: Canvas Store Edit State

**Add to `src/lib/stores/canvas.svelte.ts`:**

```typescript
// Add to CanvasStore class
editingCardId = $state<string | null>(null);

enterEditMode(cardId: string): void {
  this.editingCardId = cardId;
  // Notify vite plugin to suppress hot reload
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('edit-mode-enter', { detail: { cardId } }));
  }
}

exitEditMode(): void {
  const wasEditing = this.editingCardId;
  this.editingCardId = null;
  // Notify vite plugin to resume hot reload
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('edit-mode-exit', { detail: { cardId: wasEditing } }));
  }
}
```

### Phase 4: Hot Reload Suppression

**Modify `vite.config.ts`:**

```typescript
function vaultHotReload(): Plugin {
  let isEditMode = false;
  let pendingReload = false;

  return {
    name: 'vault-hot-reload',
    configureServer(server) {
      const contentDir = 'content/notes';
      server.watcher.add(contentDir);

      // Track edit mode via custom events (client → server not directly possible,
      // so we use a simple debounce approach instead)
      let lastWriteTime = 0;
      const WRITE_DEBOUNCE = 2000; // Ignore changes within 2s of API write

      server.watcher.on('change', (path) => {
        if (path.includes('content/notes') && path.endsWith('.md')) {
          const now = Date.now();

          // If change happened very recently after a write, it's likely our own save
          if (now - lastWriteTime < WRITE_DEBOUNCE) {
            console.log(`[vault] Ignoring self-triggered change: ${path}`);
            return;
          }

          console.log(`\n[vault] ${path} changed, rebuilding...`);
          try {
            execSync('npx tsx scripts/build-vault.ts', { stdio: 'inherit' });
            server.ws.send({ type: 'full-reload' });
          } catch (e) {
            console.error('[vault] Build failed:', e);
          }
        }
      });

      // Track when API writes happen
      server.middlewares.use((req, res, next) => {
        if (req.method === 'PUT' && req.url?.startsWith('/api/notes/')) {
          lastWriteTime = Date.now();
        }
        next();
      });
    }
  };
}
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] Click on card content (not wikilinks) enters edit mode
- [ ] Textarea shows raw markdown including frontmatter
- [ ] Cmd+B wraps selection in `**bold**`
- [ ] Cmd+I wraps selection in `*italic*`
- [ ] `[[` inserts wikilink brackets and positions cursor inside
- [ ] Escape key exits edit mode
- [ ] Click outside card exits edit mode
- [ ] Changes auto-save after 1.5s of inactivity
- [ ] Cmd+S forces immediate save
- [ ] Visual indicator shows save status (saving, saved, error)
- [ ] Only one card can be in edit mode at a time

### Non-Functional Requirements

- [ ] Edit mode entry < 100ms
- [ ] Save request < 500ms
- [ ] No layout shift when entering/exiting edit mode
- [ ] Hot reload doesn't interrupt active editing

### Quality Gates

- [ ] API endpoint validates slug to prevent path traversal
- [ ] Textarea preserves cursor position after wrap operations
- [ ] Native undo/redo works in textarea
- [ ] Works with existing canvas navigation (back/forward)

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Click wikilink while editing | Exit edit mode, navigate to linked card |
| Network error during save | Show error indicator, keep in edit mode, retry on next change |
| File doesn't exist | API creates file with content |
| Navigate away while editing | Auto-save on blur, then navigate |
| Refresh during unsaved edit | Browser "unsaved changes" warning (via beforeunload) |
| Hot reload during edit | Suppressed until edit mode exits |
| Two cards have same note | Only one instance editable, both update after save |

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/utils/markdown-shortcuts.ts` | Create | Text manipulation utilities |
| `src/routes/api/notes/[slug]/+server.ts` | Create | PUT/GET endpoint for markdown files |
| `src/lib/components/NoteCard.svelte` | Modify | Add edit mode, textarea, hotkeys |
| `src/lib/stores/canvas.svelte.ts` | Modify | Add `editingCardId` state |
| `vite.config.ts` | Modify | Suppress hot reload during edits |

---

## Future Considerations

- **Wikilink autocomplete**: Dropdown showing existing notes when typing inside `[[`
- **Create new note**: Option to create new note from wikilink
- **Markdown preview**: Split view or toggle for rendered preview
- **Syntax highlighting**: Optional code highlighting in textarea
- **Collaborative editing**: Real-time sync for multi-user scenarios
- **Mobile support**: Long-press to edit on touch devices

---

## References

### Internal
- Current NoteCard: `src/lib/components/NoteCard.svelte`
- Markdown parser: `src/lib/utils/markdown.ts`
- Build script: `scripts/build-vault.ts`
- Hot reload plugin: `vite.config.ts:7-52`

### External
- [Svelte 5 Runes](https://svelte.dev/docs/svelte/$state)
- [SvelteKit API Routes](https://svelte.dev/docs/kit/routing#server)
- [textarea-markdown-editor patterns](https://github.com/craigmichaelmartin/markdown-textarea-editor)
