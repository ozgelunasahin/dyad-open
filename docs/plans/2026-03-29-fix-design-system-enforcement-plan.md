---
title: "fix: Design system enforcement — visual consistency pass"
type: fix
status: active
date: 2026-03-29
origin: design review by 4 agents (architecture, pattern, simplicity, explore)
---

# Design System Enforcement

3 PRs to bring the frontend into alignment with the design system. Each PR is one reviewable unit.

## Context

4 review agents found 23+ categories of visual inconsistency. Root cause: CSS was written without consulting the token system. See `docs/solutions/process/design-system-is-a-contract-not-a-reference.md`.

Key numbers: 25+ hardcoded font sizes (8 tokens exist), 3 colour systems, ~475 lines duplicated CSS, 6+ hover opacities, 7 border-radius values (4 tokens after PR1 adds `--radius-surface`).

## PR 1: Token enforcement + shared CSS

Plan: `docs/plans/2026-03-29-fix-pr1-token-enforcement-plan.md`

Everything that makes the design system the single source of truth. Define missing tokens, replace all hardcoded values, extract duplicated CSS to shared locations.

## PR 2: Profile page visual fixes

Plan: `docs/plans/2026-03-29-fix-pr2-profile-visual-fixes-plan.md`

Specific issues flagged by user: action card alignment, green badge wrong colour + never clears, sign-out duplicated on desktop, pulse animation inconsistent with landing page.

## PR 3: Auth pages alignment

Plan: `docs/plans/2026-03-29-fix-pr3-auth-pages-alignment-plan.md`

Login, join, waitlist are a separate design dialect (~300 lines duplicated). Bring them into the token system and extract shared auth layout.

## Out of scope (tracked separately)

- Feedback form as corner popover (todo #101)
- Admin archive feedback as actioned (new requirement)
- These are functional changes, not design system enforcement
