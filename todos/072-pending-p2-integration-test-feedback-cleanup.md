---
status: pending
priority: p2
issue_id: "072"
tags: [testing, feedback, gate, developer-experience]
dependencies: []
---

# Integration Tests Leave Due Feedback Forms in Local Database

## Problem Statement

The feedback lifecycle integration tests create `due` feedback forms but don't clean them up. When a developer runs integration tests and then browses the app locally, the feedback gate in `hooks.server.ts` intercepts every authenticated request and redirects to `/feedback/[id]` — which doesn't exist yet (PR 4). This makes the app unusable for local development after running tests.

## Findings

Each integration test run creates 2-4 feedback forms with `state = 'due'` for the seed users. These persist across dev server restarts because they're in the Supabase database.

## Proposed Solutions

### Option A: Add test cleanup in afterAll hooks
Each integration test file that creates feedback forms should delete them in `afterAll`. This keeps the test database clean for local development.

- **Pros:** Targeted, only cleans up what tests create
- **Cons:** Easy to forget when writing new tests
- **Effort:** Small

### Option B: Use a separate test database or transaction rollback
Run integration tests in a transaction that rolls back, or use a separate database instance.

- **Pros:** Perfect isolation
- **Cons:** Larger infrastructure change
- **Effort:** Medium

## Acceptance Criteria

- [ ] Running `npm run test:integration` does not leave `due` feedback forms for seed users
- [ ] Local dev browsing works immediately after running integration tests
