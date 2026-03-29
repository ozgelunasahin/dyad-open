---
title: "Design system is a contract, not a reference"
problem_type: process
modules: [css, design-system, components]
severity: high
date_discovered: 2026-03-29
status: resolved
tags: [process, design-system, css, claude-workflow]
---

# Design system is a contract, not a reference

## Problem

The design system doc (`docs/design/design-system.md`) and CSS tokens (`src/app.css`) were created as the source of truth for visual decisions. But during implementation across Sessions 1-4, they were treated as a reference document — consulted sometimes, ignored often. The result: 25+ hardcoded font sizes for 8 defined tokens, 3 competing colour systems, ~475 lines of duplicated CSS, and pages that look subtly different from each other.

## Root Cause

When implementing UI, Claude:
- Copied CSS from the design reference branch verbatim (e.g., `border-radius: 20px`, `#22c55e`) instead of translating values into the token system
- Hardcoded pixel/rem values when building new components instead of looking up the correct token
- Duplicated CSS across pages instead of extracting shared patterns when they appeared a second time
- Never checked the design system doc before writing new CSS rules

The auth pages (login, join, waitlist) were built before the design system existed and never migrated — a different problem, but the same outcome.

## Solution

**Every CSS value must reference a token. If no token exists, the question is "do we need a new token?" — not "I'll hardcode it."**

### For Claude (when writing CSS):

1. **Before writing any CSS property**, check if a token exists in `src/app.css`:
   - Font size → `--text-*` tokens
   - Spacing (margin, padding, gap) → `--space-*` tokens
   - Colour → `--text-*`, `--bg-*`, `--color-*`, `--border-*` tokens
   - Border radius → `--radius-*` tokens
   - Line height → `--leading-*` tokens

2. **If no token matches**, ask: should we add one? Don't hardcode a value that sits between two tokens.

3. **If a pattern appears twice**, extract it to `src/lib/styles/shared.css` or a shared component. Don't wait for a third occurrence.

4. **When copying code from a design reference branch**, translate every value into the token system. Never paste raw CSS from an old branch.

5. **When reviewing your own CSS**, grep for bare `px`, `rem`, `#` values — each one is a potential token violation.

### For the design system doc:

- It is a **constraint**, not a suggestion
- If implementation needs to deviate, update the doc first (make it a conscious decision)
- The doc and the code must stay in sync — if you change a token value, update the doc

## Prevention

- Before starting any UI work, re-read the relevant section of `docs/design/design-system.md`
- After writing CSS, run a quick self-audit: are there hardcoded values that should be tokens?
- When extracting components, check `shared.css` for existing patterns before writing new ones
- Track design system compliance in code reviews — flag hardcoded values

## Related

- `docs/plans/2026-03-29-fix-design-system-enforcement-plan.md` — the cleanup plan
- `docs/design/design-system.md` — the design system spec
- `src/app.css` — CSS token definitions
- `src/lib/styles/shared.css` — shared component styles
