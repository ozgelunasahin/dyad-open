---
title: "fix: PR2 — Profile page visual fixes"
type: fix
status: active
date: 2026-03-29
origin: docs/plans/2026-03-29-fix-design-system-enforcement-plan.md
---

# PR2: Profile Page Visual Fixes

Specific issues flagged by user on the profile page. Depends on PR1 (tokens) being merged first.

## Items

- [ ] Fix green badge colour: replace #22c55e / rgba(34,197,94) with var(--color-success) / rgba from token
- [ ] Unify pulse animation: use opacity-based pulse (matching landing page city dot), not box-shadow ring
- [ ] Fix badge clearing logic: conversations card badge should indicate "needs attention" (pending invitations, feedback due), not "has any conversations"
- [ ] Fix action card alignment: token-based padding, consistent gap with profile card above
- [ ] Remove sign-out from profile page on desktop (sidebar already has it) — keep on mobile via media query
- [ ] Fix profile card border-radius: use token or define --radius-card-lg if 20px is intentional

## Acceptance Criteria

- [ ] Green badge uses --color-success throughout (no Tailwind/hardcoded greens)
- [ ] Pulse animation matches landing page (opacity, not box-shadow)
- [ ] Badge only shows when there are actionable items (not just "conversations exist")
- [ ] Sign-out appears once on desktop
- [ ] Action cards visually aligned with profile card spacing
