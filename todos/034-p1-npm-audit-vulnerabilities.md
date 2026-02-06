---
status: pending
priority: p1
id: "034"
tags: [code-review, security, dependencies]
---

# npm audit: 11 Known Vulnerabilities

## Problem Statement

`npm audit` reports 11 vulnerabilities including svelte XSS (moderate), @sveltejs/kit DoS (high), and devalue DoS (high). These affect the application's core framework.

## Findings

### From Security Review

Key vulnerabilities:
- **svelte 5.46.0-5.46.3**: XSS (GHSA-6738-r8g5-qwp3)
- **@sveltejs/kit**: Memory amplification DoS + SSRF in prerendering
- **devalue 5.1.0-5.6.1**: DoS via memory/CPU exhaustion
- **cookie <0.7.0**: Accepts out-of-bounds characters
- **undici 7.x**: Unbounded decompression chain

## Proposed Solution

Run `npm audit fix` and verify build still succeeds.

**Effort:** Small (15 min)
**Risk:** Low (patch updates only)

## Acceptance Criteria

- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] Build succeeds after update
- [ ] App runs correctly in dev

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-06 | Created from hand-off review | Keep deps up to date |

## Resources

- Security review agent report
