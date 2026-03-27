---
status: pending
priority: p2
issue_id: "093"
tags: [code-review, security, seed-data]
dependencies: []
---

# Hardcoded passwords in committed seed scripts

## Problem Statement

`scripts/seed-remote.ts` and `tests/auth.setup.ts` contain hardcoded passwords (`dyad2026!`) for named user accounts. If reused on production, an attacker with repo access can authenticate as any seeded user.

## Proposed Fix

- Move test passwords to env vars (`SEED_PASSWORD` in `.env`)
- Add a guard: seed script refuses to run if Supabase URL doesn't contain `localhost` or a known staging domain
- For production seeding, generate random passwords and emit to stdout only
