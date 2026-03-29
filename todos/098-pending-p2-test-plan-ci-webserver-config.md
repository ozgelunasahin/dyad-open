---
status: pending
priority: p2
issue_id: "098"
tags: [code-review, testing, ci-cd, playwright]
dependencies: []
---

# CI: playwright.config.ts needs conditional webServer + trace

## Problem Statement

Plan says use `build && preview` for CI and disable traces, but `playwright.config.ts` currently hardcodes `npm run dev` on port 5173 and `trace: 'on-first-retry'`. These must be environment-conditional.

## Findings

### webServer command (Simplicity + TypeScript reviewers)
- Plan Item 5 says `npm run build && npm run preview` for CI — more realistic, faster startup
- Preview runs on port 4173, not 5173 — baseURL must also change
- Current config: `command: 'npm run dev'`, `url: 'http://localhost:5173'`

### trace setting (Security sentinel)
- Current: `trace: 'on-first-retry'` — traces contain full HTTP headers with Bearer tokens
- Plan says `trace: 'off'` in CI — but config needs conditional, not static change

## Proposed Solution

```typescript
webServer: process.env.CI
  ? { command: 'npm run build && npm run preview', url: 'http://localhost:4173', reuseExistingServer: false }
  : { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
use: {
  trace: process.env.CI ? 'off' : 'on-first-retry',
  screenshot: 'only-on-failure',
}
```

## Acceptance Criteria

- [ ] `playwright.config.ts` uses `build + preview` in CI, `dev` locally
- [ ] baseURL switches between 4173 (CI) and 5173 (local)
- [ ] `trace: 'off'` in CI, `'on-first-retry'` locally
