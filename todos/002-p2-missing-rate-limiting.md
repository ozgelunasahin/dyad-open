---
status: pending
priority: p2
id: "002"
tags: [code-review, security, authentication]
---

# Missing Rate Limiting on Authentication Endpoints

## Problem Statement

Login and registration endpoints have no rate limiting, CAPTCHA, or account lockout mechanism. This enables brute force and credential stuffing attacks.

## Findings

### Security Sentinel Agent

**Files**:
- `src/routes/login/+page.server.ts`
- `src/routes/register/+page.server.ts`

No protection against:
- Brute force password guessing
- Credential stuffing attacks
- User enumeration (different error messages for valid/invalid emails)

## Proposed Solutions

### Option A: IP-based Rate Limiting
- **Description**: Use `rate-limiter-flexible` to limit attempts per IP
- **Pros**: Effective against automated attacks
- **Cons**: Shared IPs (cafes, VPNs) may be affected
- **Effort**: Medium
- **Risk**: Low

### Option B: Account-based Lockout
- **Description**: Lock account after N failed attempts
- **Pros**: More targeted protection
- **Cons**: DOS vector (lock others out)
- **Effort**: Medium
- **Risk**: Medium

## Recommended Action

**Option A** for short-term protection. Consider progressive delays or CAPTCHA for production.

## Acceptance Criteria

- [ ] Login endpoint rate limited (e.g., 5 attempts/minute)
- [ ] Registration endpoint rate limited
- [ ] Appropriate error message when rate limited

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by security-sentinel agent |
