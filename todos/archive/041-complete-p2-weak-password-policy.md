---
status: pending
priority: p2
id: "041"
tags: [code-review, security, auth]
---

# Weak Password Policy (6 Character Minimum)

## Problem Statement

The join/signup flow in `src/routes/join/+page.server.ts` (line 64) requires only 6 characters for passwords. NIST recommends a minimum of 8 characters. There is no complexity requirement, no maximum length check, and no check against common/breached passwords.

## Findings

### Security Sentinel Agent

- `src/routes/join/+page.server.ts:64` — `password.length < 6`
- No maximum length check (potential DoS with very long passwords)
- No complexity requirements
- No common password checking

## Proposed Solutions

### Option A: Increase minimum to 8, add max of 128 (Recommended)
Simple validation change aligned with NIST guidelines.
- **Pros:** Quick, meaningful security improvement
- **Cons:** Existing users with 6-7 char passwords not affected retroactively
- **Effort:** Small (15 min)
- **Risk:** Low

## Technical Details

**Affected files:**
- `src/routes/join/+page.server.ts`

## Acceptance Criteria

- [ ] Minimum password length is 8 characters
- [ ] Maximum password length is 128 characters
- [ ] Error messages are clear and helpful
