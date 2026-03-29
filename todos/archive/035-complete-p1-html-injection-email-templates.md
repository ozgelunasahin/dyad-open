---
status: pending
priority: p1
id: "035"
tags: [code-review, security, xss]
---

# HTML Injection in Email Templates

## Problem Statement

User-supplied `displayName` is interpolated directly into HTML email templates without escaping in `/api/contact/+server.ts` (line 113-123) and `/api/invites/+server.ts` (line 95-105). An attacker submitting a name like `<img src=x onerror=alert(1)>` can inject arbitrary HTML into emails sent from `hello@dyad.berlin`, enabling phishing attacks.

## Findings

### Security Sentinel Agent

- `src/routes/api/contact/+server.ts:113` — `displayName` interpolated into `html:` template string without escaping
- `src/routes/api/invites/+server.ts:95` — Same pattern in invite email
- The `displayName` is derived from user input with only a trim check: `(typeof name === 'string' && name.trim()) || 'there'`
- No HTML entity escaping applied before interpolation

## Proposed Solutions

### Option A: Add HTML escape utility (Recommended)
Create a simple `escapeHtml()` function and apply it before interpolation.
- **Pros:** Simple, zero dependencies, fixes the root cause
- **Cons:** Must remember to use it in future email templates
- **Effort:** Small (30 min)
- **Risk:** Low

### Option B: Use a templating library for emails
Use a library like `mjml` or `handlebars` with auto-escaping.
- **Pros:** Auto-escaping by default, better email rendering
- **Cons:** New dependency, over-engineered for current scale
- **Effort:** Medium
- **Risk:** Low

## Technical Details

**Affected files:**
- `src/routes/api/contact/+server.ts`
- `src/routes/api/invites/+server.ts`

## Acceptance Criteria

- [ ] All user-supplied values in email HTML templates are escaped
- [ ] Test with `<script>alert(1)</script>` as name — should render as text, not execute
- [ ] Both contact and invite email paths covered
