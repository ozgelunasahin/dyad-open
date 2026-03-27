---
status: pending
priority: p2
id: "040"
tags: [code-review, security]
---

# Invite URL Constructed from Attacker-Controllable Origin Header

## Problem Statement

The invite email URL is built using `request.headers.get('origin')` in `src/routes/api/invites/+server.ts` (lines 51, 91-92). While generally trustworthy for same-origin browser requests, this could be exploited in CSRF-like scenarios to send invite emails with links pointing to an attacker-controlled domain.

## Findings

### Security Sentinel Agent

- `src/routes/api/invites/+server.ts:51` — `const origin = request.headers.get('origin') || 'https://dyad.berlin'`
- Fallback is correct but the primary path trusts the header
- If triggered from a different origin, invite email contains a phishing link

## Proposed Solutions

### Option A: Hardcode the origin (Recommended)
Use `const origin = 'https://dyad.berlin'` or an environment variable.
- **Pros:** One-line fix, eliminates the attack vector entirely
- **Cons:** Must update for staging/development environments
- **Effort:** Small (5 min)
- **Risk:** None

## Technical Details

**Affected files:**
- `src/routes/api/invites/+server.ts`

## Acceptance Criteria

- [ ] Invite URL always points to the production domain or a configured env var
- [ ] Origin header is not used for URL construction
