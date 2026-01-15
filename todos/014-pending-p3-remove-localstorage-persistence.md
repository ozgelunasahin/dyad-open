---
status: pending
priority: p3
issue_id: "014"
tags: [code-review, simplification, code-quality]
dependencies: []
---

# Remove Redundant localStorage Persistence

## Problem Statement

Canvas state persists to both localStorage AND database with fallback/migration logic. Once database persistence works, localStorage becomes redundant (~80 lines).

## Findings

### Code Simplicity Reviewer Agent

**File**: `src/lib/stores/canvas.svelte.ts:36-56, 202-234`

The migration code at line 231 (`this.persistToDatabase()`) suggests localStorage was the original storage and is now being migrated. The fallback logic adds complexity.

## Proposed Solutions

### Option A: Remove localStorage for Positions (Recommended)
- **Description**: Use database only for position storage, keep localStorage only for camera (local preference)
- **Pros**: ~80 LOC reduction, simpler initialization
- **Cons**: Loss of offline capability (was this used?)
- **Effort**: Small
- **Risk**: Low

## Recommended Action

**Option A** - Keep only camera in localStorage, remove position fallback.

## Acceptance Criteria

- [ ] Position storage uses database only
- [ ] Camera state still persisted locally
- [ ] Migration path for existing localStorage data
- [ ] Initialization logic simplified

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-15 | Created | Identified by code-simplicity-reviewer agent |
