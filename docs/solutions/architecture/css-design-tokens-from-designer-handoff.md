---
topic: Extracting CSS design tokens from a designer's branch work
date: 2026-03-27
prs: [42, 46]
tags: [css, design-tokens, designer-handoff, consistency, app-css]
---

# CSS Design Tokens from Designer Handoff

## Context

Ozge's design branches (`feat/v0.1-design-work`, `feat/v0.1-design-profile`) contained polished UI work using the old canvas data model. The code could not be merged directly -- the data model had changed completely. But the visual patterns (colors, radii, transitions, hover effects, thumbnail dimensions) needed to be adopted. PR #42 extracted these into CSS custom properties and applied them across all pages.

## What We Learned

### Hardcoded values diverge immediately

Before PR #42, the same green color appeared as `#3d9e5a` in one component, `rgba(61,158,90,0.12)` in another (for badge backgrounds), and `#2d7a42` for badge text. The same border radius appeared as `12px`, `16px`, and `6px` depending on which component was written first. None of these were wrong individually -- they diverged because there was no single source of truth.

### Six tokens covered 80% of the inconsistency

The token set added to `:root` in `app.css`:

```css
/* Status colours */
--color-success: #3d9e5a;
--color-danger: #c00;
--color-saving: #f59e0b;

/* Border radii */
--radius-pill: 999px;
--radius-card: 12px;
--radius-input: 6px;
--radius-thumb: 6px;
```

These six tokens resolved the majority of inconsistencies across discover, profile, editor, meeting, and feedback pages. The pre-existing theme tokens (`--bg-canvas`, `--text-primary`, `--text-muted`, `--border-link`, `--bg-control`) handled the rest.

Notably absent: spacing tokens. The codebase uses raw `px` values for padding and margins. This is intentional for v0.1 -- spacing tokens add overhead without clear payoff when the designer is working in the same branch as the developer. Revisit if the team grows.

### Hover and transition conventions are tokens too

The design branches used consistent but undocumented conventions:

- List item hover: `opacity: 0.72`
- Button hover: `opacity: 0.85`
- All transitions: `0.15s` duration
- Thumbnail dimensions: `88px x 96px` (discover cards), `64px x 64px` (bottom sheet cards), `44px x 44px` (map markers)

These are not CSS custom properties -- they are conventions documented in the plan (`docs/plans/2026-03-26-refactor-terminology-styling-pass-plan.md`) and enforced by code review. Converting them to tokens would add complexity without adding value at this scale.

### The designer's code is a specification, not a deliverable

Ozge's branches had working Svelte components with real CSS. But the data model had changed (canvas notes to prompts/conversations), the routing had changed, and the component structure had changed. The useful artifact was not the code itself but the implicit design specification embedded in the CSS values.

The extraction process was:
1. `git show origin/feat/v0.1-design-work:src/routes/discover/+page.svelte` to read CSS
2. Identify recurring values (colors, radii, hover effects)
3. Promote to CSS custom properties in `app.css`
4. Apply across all current pages
5. Verify visual consistency

## The Fix / Pattern

1. **Tokens in `app.css` `:root`**: Colors and radii that appear in 3+ components
2. **Conventions in documentation**: Hover effects, transitions, thumbnail sizes that are consistent but not worth tokenizing
3. **Designer code as spec**: Read the CSS values, do not merge the components
4. **Incremental adoption**: Start with the smallest token set that resolves visible inconsistency. Add tokens only when divergence reappears

## Why This Matters

Design tokens are a scaling mechanism. Without them, every new component introduces micro-inconsistencies that compound over time. But over-tokenizing early (spacing scales, typography scales, breakpoint tokens) adds indirection that slows down a small team. The threshold in this project was "appears in 3+ components" -- below that, a raw value is fine.

The deeper lesson: when a designer works in a feature branch that cannot be merged (due to model changes), treat their CSS as a specification document, not a merge target. Extract the values, discard the structure.
