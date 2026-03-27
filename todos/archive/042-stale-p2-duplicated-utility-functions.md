---
status: pending
priority: p2
id: "042"
tags: [code-review, quality, dry]
---

# Duplicated Utility Functions Across API Routes

## Problem Statement

Several utility functions are copy-pasted across multiple API route files with slight variations in type safety and validation rules.

## Findings

### TypeScript Reviewer Agent

**`findFirstImage` — 3 copies:**
1. `src/routes/api/notes/[slug]/+server.ts:265` — typed as `JSONContent`
2. `src/routes/+page.server.ts:223` — typed as `any`
3. `src/routes/api/landing-highlights/+server.ts:114` — typed as `any`

**`verifySiteOwnership` — 2 copies:**
1. `src/routes/api/sites/[id]/pages/+server.ts:6-23`
2. `src/routes/api/sites/[id]/pages/[pageId]/+server.ts:4-21`

**`requireAdmin` — 2 copies:**
1. `src/routes/api/landing-highlights/+server.ts:6-20`
2. `src/routes/api/invites/+server.ts:9-23`

## Proposed Solutions

### Option A: Extract to shared utility modules (Recommended)
- `findFirstImage` → `src/lib/utils/json-content.ts` (file already exists)
- `verifySiteOwnership` → `src/lib/server/auth.ts` (new file)
- `requireAdmin` → `src/lib/server/auth.ts` (same file)
- **Pros:** Single source of truth, consistent type safety
- **Cons:** Minor refactor across 7 files
- **Effort:** Small-Medium
- **Risk:** Low

## Technical Details

**Affected files:** 7 files across src/routes/api/ and src/routes/

## Acceptance Criteria

- [ ] Each utility function exists in exactly one location
- [ ] All copies use the properly typed version (JSONContent, not any)
- [ ] No behavior changes in API responses
