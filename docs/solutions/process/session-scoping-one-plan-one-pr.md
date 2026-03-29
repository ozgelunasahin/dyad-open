---
title: "Session scoping: don't bundle unrelated workstreams"
problem_type: process
modules: [planning, review, implementation]
severity: high
date_discovered: 2026-03-28
status: resolved
tags: [process, scoping, planning, claude-workflow]
---

# Session scoping: don't bundle unrelated workstreams

## Problem

Session 3b bundled ~10 unrelated workstreams into one PR: security fixes, navigation overhaul, copy centralization, profile redesign, meeting notifications, map interactions, and more. The result was a PR with 30+ commits across 110 files that was difficult to review and accumulated design drift.

## Root Cause

Items were grouped by "phase" rather than by concern. The brainstorm produced a comprehensive gap analysis (good) but everything got dumped into one session plan.

## Solution

**Group by concern, not by phase.** A PR should touch one coherent area of the codebase. The test is: can a reviewer understand this PR without needing context from other unrelated changes?

**What "one concern" means:**
- "Token enforcement across all pages" = one concern (one system, many files)
- "Feedback reveal feature" = one concern (one user flow, multiple layers)
- "Test harness" = one concern (test infrastructure)
- "Copy centralization + profile redesign + meeting notifications" = three concerns, should be separate

**What it does NOT mean:**
- Every checkbox gets its own PR — that's over-splitting
- A PR can only touch 5 files — large coherent changes are fine
- Migrations can't ship with the code that uses them — they should

**Rules of thumb:**
- If the PR description needs section headers for unrelated features, it's too big
- If items within the plan have no dependencies on each other and touch different files, they're probably separate concerns
- If ad-hoc feedback during implementation introduces a new concern, create a todo — don't expand the current PR

## Related

- `docs/solutions/process/review-before-implement-pattern.md`
