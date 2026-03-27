---
status: pending
priority: p2
id: "039"
tags: [code-review, security, xss]
---

# ExpandableContent Uses Manual Escaping Instead of DOMPurify

## Problem Statement

`src/lib/components/ExpandableContent.svelte` uses `{@html}` with a custom `renderMarkedText()` function that implements manual HTML escaping instead of using DOMPurify. While the current implementation does escape text content, it lacks defense-in-depth compared to the DOMPurify approach used in `tiptap-html.ts`.

## Findings

### Security Sentinel Agent

- Lines 117, 159, 165, 171, 177: `{@html renderMarkedText(node)}` calls
- `renderMarkedText()` (line 76) does implement `escapeHtml()` on text content
- Blocks `javascript:`, `data:`, `vbscript:` URIs in link hrefs
- But no client-side whitelist check for `mark.type` values
- Relies entirely on server-side validation having been performed earlier

## Proposed Solutions

### Option A: Run output through DOMPurify (Recommended)
Pipe `renderMarkedText()` output through DOMPurify before `{@html}` rendering.
- **Pros:** Defense-in-depth, consistent with tiptap-html.ts approach
- **Cons:** Adds DOMPurify call on client-side render
- **Effort:** Small
- **Risk:** Low

### Option B: Add client-side mark type whitelist
Validate `mark.type` against a known set within the component.
- **Pros:** Lightweight, no additional dependency
- **Cons:** Still manual — may miss edge cases
- **Effort:** Small
- **Risk:** Low

## Technical Details

**Affected files:**
- `src/lib/components/ExpandableContent.svelte`

## Acceptance Criteria

- [ ] All {@html} output in ExpandableContent passes through DOMPurify or equivalent
- [ ] Unknown mark types are safely handled
- [ ] No XSS possible even with malformed TipTap JSON
