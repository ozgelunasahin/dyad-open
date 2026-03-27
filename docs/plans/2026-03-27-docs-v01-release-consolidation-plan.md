---
title: "docs: v0.1 Release Consolidation — compound learnings, archive state, review decisions"
type: docs
status: active
date: 2026-03-27
---

# v0.1 Release Consolidation

Before deploying to testers, consolidate what was built and learned across 30 PRs. Create solution documents from each PR's discoveries, review and consolidate architectural decisions, clean up stale documentation, and establish a clear v0.1 baseline.

## Motivation

We built the entire v0.1 in ~3 days across 30 PRs. The code works but the institutional knowledge is scattered across PR descriptions, commit messages, plan files, brainstorm notes, and conversation transcripts. Before testers arrive, we need to:

1. **Compound learnings** — extract solution documents from every PR so future sessions don't repeat mistakes
2. **Consolidate decisions** — architectural and design decisions are spread across docs/design/, docs/plans/, CLAUDE.md, and brainstorms. Consolidate into a coherent state.
3. **Clean house** — archive completed plans, triage remaining todos, remove stale docs
4. **Tag the release** — git tag v0.1.0 with a clear changelog

## Phase 1: Compound Learnings from Every PR

Run `/workflows:compound` retroactively on each merged PR to create solution documents in `docs/solutions/`.

### PRs to Compound (30 total, grouped by theme)

**Infrastructure & Backend (PRs #32-38)**
| PR | Title | Key Learnings to Extract |
|----|-------|--------------------------|
| #32 | Discover feed for prompt domain model | Supabase query patterns, post-fetch filtering limitation |
| #33 | Auto-archive stale prompts | Postgres function + cron pattern, integration test approach |
| #34 | Comments and meeting invitations | RLS policy design, one-comment-per-user constraint |
| #35 | Meetings backend | SECURITY DEFINER pattern, cascading state transitions |
| #36 | Feedback forms + gate | Simultaneous reveal, gate middleware in hooks.server.ts |
| #37 | Sovereignty remediation | Self-hosted assets, Nominatim proxy, Mailpit for dev |
| #38 | Remove canvas code (~28k lines) | Large deletion strategy, keeping migration history |

**Frontend Foundation (PRs #39-46)**
| PR | Title | Key Learnings to Extract |
|----|-------|--------------------------|
| #39 | Landing page + shared layout | (app) layout group, auth redirect pattern |
| #40 | Author experience — editor, scheduling | TipTap + Svelte 5 integration, PublishSheet pattern |
| #41 | Reader experience — detail, meetings, feedback | Response-first flow, feedback gate UX |
| #42 | Terminology + CSS tokens | Domain language anti-corruption layer, design token system |
| #43 | Map view with list/map toggle | Leaflet dynamic import, fuzz centroid algorithm |
| #44 | Scrolling, response-first, copy fixes | Svelte 5 reactive gotchas, inclusive language |
| #45 | Deployment blockers | Error display patterns, feedback form simplification |
| #46 | FloatingNav integration | Design branch reference checking, component variants |

**Design & Navigation (PRs #47-54)**
| PR | Title | Key Learnings to Extract |
|----|-------|--------------------------|
| #47-49 | Sidebar/FloatingNav iterations | Sidebar stays on desktop (hard lesson), mobile-only FloatingNav |
| #50 | Profile redesign | 2x2 action grid (later replaced — document why) |
| #51 | Circular map pins + full-width cover | Map marker patterns, cover image edge cases |
| #52 | Editor redesign | Clean writing view, guidance through placeholders |
| #53 | Landing page redesign | RotatingHeadline, split-screen layout |
| #54 | Search overlay | Client-side text matching, stop word filtering |

**Core Flow Fixes (PRs #55-61)**
| PR | Title | Key Learnings to Extract |
|----|-------|--------------------------|
| #55 | Author sees invitations | Missing FK workaround, enriched joins |
| #56 | P0 prompt detail fixes | Show response text, invitation guidance copy |
| #57 | Profile restructure | Attention → Meetings → Conversations (replaced 2x2 grid) |
| #58 | Map preview interaction | BottomSheet for all pins, SvelteKit snapshots, E2E tests |
| #59 | Deploy readiness — security + rename | escapeHtml, timeslot validation, route rename with redirect |
| #60 | Invitation flow — SlotCard | Staged disclosure → simplified to inline selection |
| #61 | UX hotfixes consolidated | Iteration speed vs code quality, direct-to-main lesson |

### Execution

- [ ] For each PR group, launch a parallel agent running `/workflows:compound` with PR number and context
- [ ] Each agent reads the PR diff, identifies non-obvious learnings, and creates a solution doc
- [ ] Skip PRs where the learning is trivial or already documented
- [ ] Target: 10-15 new solution documents (not 30 — many PRs share learnings)

### Solution Document Categories

Extend the existing categories:
```
docs/solutions/
  architecture/        — service layer, domain model, state machines
  integration-issues/  — Svelte 5 + libraries, Supabase gotchas
  security-issues/     — RLS, auth, input validation
  ui-bugs/             — rendering, CSS, responsive
  ux-patterns/         — NEW: invitation flow, progressive disclosure, map interaction
  deployment/          — NEW: sovereignty, self-hosting, Cloudflare Pages
  process/             — NEW: PR workflow, direct-to-main lesson, review patterns
```

## Phase 2: Consolidate Architectural Decisions

### Review and Update CLAUDE.md

- [ ] Verify all route paths are current (after /prompts/ → /conversations/ rename)
- [ ] Update key files section with new components (SlotCard, dates.ts, escape-html.ts)
- [ ] Verify design references section is current
- [ ] Add any new patterns discovered during v0.1 (e.g., SlotCard, staged disclosure)

### Review and Update Design Docs

- [ ] `docs/design/design-system.md` — add SlotCard spec, hybrid timestamp rules
- [ ] `docs/design/design-principles.md` — review against actual implementation, note any deviations
- [ ] `docs/design/domain-language.md` — verify internal/user-facing term mapping is still accurate

### Consolidate Brainstorm → Plan → Implementation Chain

For each brainstorm, verify the chain is complete:
- [ ] `2026-03-24-backend-implementation-sequence-brainstorm.md` → plans completed, archive
- [ ] `2026-03-25-frontend-v01-core-journey-brainstorm.md` → plans completed, archive
- [ ] `2026-03-27-user-testing-feedback-brainstorm.md` → partially implemented, keep active

## Phase 3: Clean House

### Archive Completed Plans

- [ ] Review 8 active plans — mark completed ones, archive them
- [ ] Verify all checkboxes checked in completed plans before archiving

### Triage Remaining Todos

Current: 40 pending todos. Many may be stale or superseded.

- [ ] Read each todo, check if the referenced files/code still exist
- [ ] Archive stale/superseded todos
- [ ] Re-prioritise remaining todos for v0.2
- [ ] Group into themes: security, UX, architecture, performance, testing

### Remove Dead Documentation

- [ ] Check for docs referencing deleted files (canvas system, old routes)
- [ ] Verify all internal links in docs/ resolve to existing files

## Phase 4: Tag the Release

- [ ] Create `CHANGELOG.md` summarising v0.1 features
- [ ] Git tag `v0.1.0` on main
- [ ] Update CLAUDE.md with v0.1 completion note
- [ ] Create v0.2 roadmap summary (from deferred todos and the plan file)

## Acceptance Criteria

- [ ] Solution documents created for significant learnings across 30 PRs
- [ ] CLAUDE.md reflects current codebase state
- [ ] Design docs updated with implemented patterns
- [ ] Completed plans archived
- [ ] Stale todos archived, remaining re-prioritised
- [ ] Git tag v0.1.0 on main
- [ ] CHANGELOG.md exists

## Execution Strategy

**Phase 1 is the big one** — compounding 30 PRs. Use parallel agents aggressively:
- Group PRs by theme (7 groups above)
- Launch one agent per group
- Each agent processes 4-5 PRs and creates solution docs
- Merge results, deduplicate, review

**Phases 2-4 are sequential** — require human review and judgment.

## Sources

- All 30 merged PRs: #32-#61
- Existing solutions: `docs/solutions/` (6 files)
- Active plans: `docs/plans/` (8 files)
- Archived plans: `docs/plans/archive/` (25 files)
- Brainstorms: `docs/brainstorms/` (3 files)
- Pending todos: `todos/` (40 files)
