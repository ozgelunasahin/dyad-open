---
status: pending
priority: p2
id: "044"
tags: [code-review, security, auth]
---

# confirm_user_email RPC Function Not in Repository

## Problem Statement

The signup flow calls `locals.supabase.rpc('confirm_user_email', { user_email: email })` in `src/routes/join/+page.server.ts` (line 103). This is a SECURITY DEFINER function that auto-confirms email addresses, bypassing Supabase's standard email verification. The SQL definition is not present in any migration file in the repository, making it impossible to audit its access controls.

## Findings

### Security Sentinel Agent

- `src/routes/join/+page.server.ts:103` — calls `confirm_user_email` RPC
- Called with anon-key Supabase client (user just signed up)
- Function must be callable without authentication
- No SQL definition in `supabase/migrations/` directory
- If access controls are insufficient, anyone could confirm arbitrary email addresses

## Proposed Solutions

### Option A: Audit and add to migrations (Recommended)
Export the function definition from Supabase dashboard, verify access controls, add to migrations.
- **Pros:** Auditable, version-controlled, can verify security
- **Cons:** Requires Supabase dashboard access
- **Effort:** Small
- **Risk:** Low

### Option B: Combine with use_invitation in single atomic RPC
Merge invitation consumption and email confirmation into one function that validates the invitation token.
- **Pros:** Atomic, harder to abuse, single entry point
- **Cons:** More complex SQL function
- **Effort:** Medium
- **Risk:** Low

## Technical Details

**Affected files:**
- `src/routes/join/+page.server.ts`
- Supabase database (function definition)

## Acceptance Criteria

- [ ] `confirm_user_email` SQL definition exists in migrations
- [ ] Function validates that a legitimate invitation was consumed
- [ ] Function cannot be called to confirm arbitrary email addresses
