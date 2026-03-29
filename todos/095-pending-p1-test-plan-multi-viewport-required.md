---
status: pending
priority: p1
issue_id: "095"
tags: [code-review, testing, playwright, responsive]
dependencies: []
---

# Multi-viewport E2E testing must be in v0.1 plan, not deferred

## Problem Statement

The test harness plan defers mobile viewport testing to "manual for alpha" (Item 6d, scope reduction table). This directly conflicts with the non-negotiable requirement: all frontend E2E tests must run at two desktop sizes AND mobile.

## Findings

- Architecture strategist: use `*.responsive.test.ts` naming convention to control which tests run at all viewports vs desktop-only
- Performance oracle: selective viewport targeting keeps CI at ~5 min (only smoke + signup at all 3 viewports)
- Simplicity reviewer: "This is literally 15 lines of config, not a separate work item"

## Proposed Solutions

### Option A: Promote into Item 5 with file naming convention (RECOMMENDED)

Add 3 Playwright projects to config. Use `*.responsive.test.ts` for tests that run at all viewports. Logic-heavy tests (`core-flow`, `admin`, `feedback`) run at desktop-large only.

- **Pros:** meets requirement, minimal CI time impact (~5 min), clean separation
- **Cons:** naming convention is a new pattern to learn
- **Effort:** Small (15 lines config + rename smoke.test.ts)
- **Risk:** Low

### Option B: Run ALL tests at ALL viewports

- **Pros:** maximum coverage
- **Cons:** CI time triples to 7-9 min, data isolation issues with parallel execution
- **Effort:** Small (config only)
- **Risk:** Medium (timing, shared state)

## Acceptance Criteria

- [ ] Plan Item 5 includes 3 Playwright projects (desktop-large 1920x1080, desktop-small 1280x720, mobile Pixel 7)
- [ ] `*.responsive.test.ts` convention documented
- [ ] smoke.test.ts renamed to smoke.responsive.test.ts
- [ ] signup.test.ts planned as signup.responsive.test.ts
- [ ] Item 6d removed from plan
- [ ] "Mobile automated testing" removed from "What This Plan Does NOT Include"
