---
status: pending
priority: p3
id: "047"
tags: [code-review, security]
---

# Projections Route Publicly Accessible

## Problem Statement

`src/routes/projections/+page.svelte` is a 206-line revenue projection chart with hardcoded business financial data. It has no authentication gate and is publicly accessible at `/projections`.

## Findings

### Code Simplicity Reviewer Agent

- `src/routes/projections/+page.svelte` — hardcoded financial projections
- No `+page.server.ts` with auth check
- No redirect for unauthenticated users
- Contains business-sensitive revenue forecasts

## Proposed Solutions

### Option A: Add auth gate (Recommended)
Create a `+page.server.ts` that redirects non-admin users.
- **Pros:** Quick fix, keeps the tool available for admins
- **Cons:** Adds a file
- **Effort:** Small (10 min)
- **Risk:** None

### Option B: Remove from production
Move to a separate internal tool or delete entirely.
- **Pros:** Cleanest solution if not needed in production
- **Cons:** Loses the tool
- **Effort:** Small
- **Risk:** None

## Technical Details

**Affected files:**
- `src/routes/projections/+page.svelte`
- New: `src/routes/projections/+page.server.ts`

## Acceptance Criteria

- [ ] `/projections` route requires admin authentication
- [ ] Unauthenticated users get redirected
