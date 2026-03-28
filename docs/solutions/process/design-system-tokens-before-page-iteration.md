---
topic: Introduce design tokens before iterating on individual pages
date: 2026-03-27
prs: [50, 51, 52, 53, 54]
tags: [process, design-system, css, tokens, consistency]
---

# Introduce Design Tokens Before Iterating on Individual Pages

## Context

PRs #50-54 redesigned five different surfaces in rapid succession: profile page, map pins, conversation detail, editor, landing page, and search overlay. Each PR was implemented independently, and each one introduced its own hardcoded CSS values for spacing, typography, and border radii.

By the time PR #52 (editor redesign) landed, the codebase audit revealed:

- **36 distinct font-size values** (including near-duplicates like `0.85rem`, `0.82rem`, `0.8rem`, `0.78rem`)
- **17 distinct border-radius values** (while `--radius-card` and `--radius-input` existed but were used only 3 times)
- **`font-family: 'SangBleu Sunrise'` repeated 99 times** (form elements don't inherit from body)
- **38+ distinct padding values** for button-like elements
- **4 different back-navigation implementations** with identical styling

PR #52 had to create a design system plan and introduce tokens (`--space-*`, `--text-*`, `--font-*`, `--leading-*`) as a prerequisite to the editor work. The token introduction then required a follow-up pass across every previously-redesigned page.

## What We Learned

1. **Hardcoded values diverge silently.** When five PRs each pick their own `font-size` for "small metadata text," you get `10px`, `11px`, `0.8rem`, `0.82rem`, and `var(--text-xs)`. None of them are wrong individually, but together they create visual inconsistency that's invisible in per-PR review.

2. **Token introduction is cheap upfront, expensive retroactively.** Adding `--space-*` and `--text-*` tokens to `app.css` was a 30-line change. Migrating 13 files to use them was a multi-commit pass that touched every redesigned page. If the tokens had existed before the redesign PRs, each PR would have used them naturally.

3. **Global form element reset eliminates an entire class of duplication.** Adding `button, input, textarea, select { font-family: inherit; }` to `app.css` eliminated 99 redundant `font-family` declarations across the codebase. This is the kind of foundational fix that should happen once, early.

4. **Design reference screenshots don't specify tokens -- but they imply consistency.** The design screenshots show consistent spacing and typography, but they don't say "use 12px here and 16px there." Without tokens, each implementer eyeballs the values independently. Tokens force the decision to be made once.

5. **Dead CSS accumulates across redesign PRs.** PR #51's review found ~200 lines of dead CSS in the discover page left over from the FloatingNav replacement of the filter bar. PR #52 found dead CSS in the conversation detail page. Each redesign PR replaced HTML but left the old CSS behind. A design system pass is also a cleanup opportunity.

## The Fix / Pattern

When planning a multi-page redesign:

1. **First PR: design tokens.** Add spacing, typography, border-radius, and font-stack tokens to `app.css`. Add the global form element reset. This is a non-breaking, additive change.

2. **Then: page redesigns use tokens.** Each subsequent PR references `var(--space-4)` instead of `16px`. Code review can enforce this mechanically: any hardcoded `px` or `rem` value in a `<style>` block is a review flag.

3. **Dead CSS check on every redesign PR.** When replacing HTML, search the `<style>` block for class names that no longer appear in the template. `svelte-check` reports unused CSS selectors -- run it.

4. **Shared patterns get a shared stylesheet.** Once two pages use the same button style, extract it to `src/lib/styles/shared.css`. Don't wait for three.

## Why This Matters

Design consistency is not about aesthetics -- it's about cognitive overhead. When a user sees 11px metadata in one place and 13px in another, it doesn't look "wrong," but it feels unpolished. Tokens make consistency the default and divergence the exception. More practically, they make future redesigns cheaper: changing `--text-xs` from `11px` to `12px` updates every surface at once.
