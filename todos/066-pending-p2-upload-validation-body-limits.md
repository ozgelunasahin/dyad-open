---
status: pending
priority: p2
issue_id: "066"
tags: [code-review, frontend-plan, security, phase-2]
dependencies: []
---

# Upload MIME Validation and TipTap JSON Body Size Limits

## Problem Statement

Two input validation gaps:

1. **File upload:** The upload endpoint checks `file.type` (MIME from HTTP header), but this is client-supplied and trivially spoofable. An attacker could upload an HTML file with `Content-Type: image/png`, creating a stored XSS vector if Supabase Storage serves it.

2. **TipTap JSON body:** `POST /api/prompts` and `PATCH /api/prompts/[id]` accept `body` as `unknown` and cast to `JSONContent` without structure or size validation. A deeply nested JSON document could cause stack overflow in `renderTiptapToHtml()`. Auto-save every 1.5s amplifies the risk.

## Findings

**Security review:** Validate file magic bytes (first 4-8 bytes) to confirm actual image format. Add JSON body size limit (e.g., 100KB). Validate TipTap structure has `type: 'doc'` at minimum.

## Proposed Solutions

### Add validation to both endpoints
1. **Upload:** Check magic bytes for PNG (`\x89PNG`), JPEG (`\xFF\xD8\xFF`), WebP (`RIFF...WEBP`), GIF (`GIF8`)
2. **Prompt body:** Add size limit check before parsing, validate `body.type === 'doc'`

- **Effort:** Small (1-2 hours)
- **Risk:** Low

## Acceptance Criteria

- [ ] Upload endpoint validates file magic bytes, not just MIME header
- [ ] Prompt API rejects body > 100KB
- [ ] Prompt API validates body has `type: 'doc'` structure
- [ ] Both validations return clear error messages

## Resources

- Upload endpoint: `src/routes/api/upload/+server.ts`
- Prompt API: `src/routes/api/prompts/+server.ts`
- Parse utility: `src/lib/server/parse-body.ts`
