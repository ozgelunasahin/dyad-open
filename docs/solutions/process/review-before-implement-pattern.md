---
topic: Review-before-implement — multi-agent review on plans, not just code
date: 2026-03-28
prs: [64]
tags: [process, planning, review, quality]
---

# Review-Before-Implement Pattern

## Context

Session 2 of v0.1 built an admin panel + app feedback system. The plan was written by a parallel Claude Code session, then reviewed by 10 agents BEFORE implementation, and the resulting PR was reviewed by 3 more agents after.

## What We Learned

**Code that never gets written has zero maintenance cost.** Catching overengineered designs at the plan stage eliminates implementation, testing, debugging, and future refactoring — all at once.

### Pre-Implementation Review (10 agents, on the plan)

| Agent | Finding | Would have been... |
|-------|---------|-------------------|
| security-sentinel | `can_publish_sites` self-update is privilege escalation | A real vulnerability |
| simplicity-reviewer | Config table + settings page for one boolean flag | ~330 LOC of unnecessary infrastructure |
| simplicity-reviewer | Platform feedback section with no data | Dead UI + SECURITY DEFINER function |
| performance-oracle + 4 others | Admin check on every request (not just gated) | 50ms added to every page load |
| data-integrity-guardian | Duplicate INSERT policy on feedback table | Confusing dead policy |
| spec-flow-analyzer | Redundant `/admin` gate exemption | Imprecise security semantics |

**Net effect:** ~330 lines eliminated before writing them. One privilege escalation caught. Architecture simplified.

### Post-Implementation Review (3 agents, on the code)

| Agent | Finding |
|-------|---------|
| security-sentinel | `recent_errors` array elements unsanitized (XSS/injection) |
| simplicity-reviewer | `/admin` gate exemption survived from plan despite being flagged as redundant |
| deployment-verifier | Confirmed migration ordering correct |

### What Each Phase Catches

**Pre-implementation** catches: overengineering, unnecessary complexity, architectural misalignment, security design flaws, scope creep.

**Post-implementation** catches: sanitization gaps, template XSS, migration edge cases, findings from pre-review that leaked through anyway.

## The Fix / Pattern

The full cycle:

```
brainstorm → plan → N-agent review → revised plan → implement → M-agent review → fix → merge
```

**The simplicity reviewer is the most valuable pre-implementation agent.** It eliminated an entire category of future maintenance burden. The security sentinel caught a real vulnerability, but the simplicity reviewer prevented more total work.

## Why This Matters

The Session 2 plan changed significantly between draft and final. The plan file has 10 numbered "Key Improvements from Review" at the top — five were security or correctness issues, not just style. Running review on the PLAN catches architectural errors that are expensive to fix after implementation.

**Counter-point:** One finding (redundant gate exemption) survived pre-review and was only caught in post-review. Both phases are needed — pre-review reduces the problem space, post-review catches what got through.

**When to use:** Plans involving auth/security boundaries, database schema changes, or multi-component features. Less needed for single-file bug fixes.
