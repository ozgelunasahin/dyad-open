---
topic: Always check design reference before removing existing UI
date: 2026-03-27
prs: [47, 48, 49]
tags: [process, design-reference, sidebar, navigation, revert]
---

# Always Check Design Reference Before Removing UI

## Context

Three PRs landed within 15 minutes on 2026-03-26:

- **PR #47** (19:13): Made sidebar and FloatingNav mutually exclusive -- sidebar on desktop, FloatingNav on mobile. Created `(editor)` route group with no sidebar.
- **PR #48** (19:18): Deleted the sidebar entirely (170 lines of CSS, all sidebar markup). Rationale: "FloatingNav is the primary navigation on all screen sizes."
- **PR #49** (19:28): Restored the sidebar. FloatingNav replaces the inline filter bar on discover, not the sidebar.

The whole sidebar was deleted and restored within 10 minutes because the agent assumed the new component replaced the old one without checking what the design reference actually showed.

## What We Learned

1. **A new component does not automatically replace an old one.** FloatingNav was built to replace the inline date/area filter bar on the discover page. It was never designed to be the app-wide navigation. The sidebar and FloatingNav serve different purposes at different viewport sizes.

2. **The design reference screenshots are the source of truth for what stays and what goes.** The reference images (`docs/design/ref-*.jpg`) and the design branches (`origin/feat/v0.1-design-work`, `origin/feat/v0.1-design-profile`) both show the sidebar on desktop. Checking either one would have prevented the deletion.

3. **Rapid-fire PRs that build on wrong assumptions compound the error.** PR #48 was merged 5 minutes after #47, with no pause to verify the design intent. The revert in #49 was necessary but wasted a full review cycle.

4. **Deletion is not the same as hiding.** PR #47's approach was correct: hide the sidebar on mobile via `@media (max-width: 768px) { .sidebar { display: none; } }`. PR #48 jumped to deletion, which is irreversible without a revert.

## The Fix / Pattern

Before removing any existing UI element:

1. **Check the design reference images** in `docs/design/ref-*.jpg` -- does the element appear in any viewport?
2. **Check the design branches** (`git show origin/feat/v0.1-design-work:<path>`, `git show origin/feat/v0.1-design-profile:<path>`) -- does the code include the element?
3. **Ask: does the new component serve the same purpose as the old one?** A filter bar and a navigation sidebar are not the same thing, even if both appear at the edge of the screen.
4. **Prefer hiding over deleting.** A media query is reversible; deleting 170 lines of CSS is not.
5. **Wait for design confirmation before merging destructive UI changes.** If in doubt, ask the human.

This is now encoded in MEMORY.md as: "Desktop always shows sidebar; FloatingNav is mobile-only; NEVER remove sidebar."

## Why This Matters

A 10-minute delete-and-restore cycle is cheap in absolute terms. But the pattern it represents -- "I see a new thing, so the old thing must be obsolete" -- is how established UI gets removed without anyone deciding to remove it. In a two-person team, there is no safety net of a second reviewer catching design regressions. The discipline has to be in the process: always check the reference before removing.
