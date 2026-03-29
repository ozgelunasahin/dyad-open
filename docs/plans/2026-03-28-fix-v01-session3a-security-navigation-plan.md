---
title: "fix: v0.1 Session 3a — Security Fix + Navigation Overhaul"
type: fix
status: active
date: 2026-03-28
origin: docs/plans/2026-03-28-feat-v01-session3-navigation-frontend-polish-plan.md
---

# v0.1 Session 3a: Security Fix + Navigation Overhaul

Phase 0 (critical security) + Phase A (navigation) from the Session 3 plan. Phase B+C will be a separate PR.

## Phase 0: Security Fix (MUST DO FIRST)

### time_slots RLS — hide accepted slots from non-participants

**Finding:** Any authenticated user can query accepted slots via Supabase REST API, revealing confirmed meeting times and approximate locations. Stalking vector.

- [ ] `supabase/migrations/20260409_fix_time_slots_rls_safeguarding.sql`:
  - Drop existing authenticated SELECT policy on `time_slots`
  - Create new policy: authors see all own slots, non-authors see only unaccepted slots of published prompts, meeting participants see their accepted slot
  - Verify anon policy also excludes accepted slots
- [ ] `src/lib/services/prompt-query.ts` — add `.eq('accepted', false)` to detail slot query as defense-in-depth
- [ ] `supabase/migrations/20260409_add_invitee_state_index.sql` — `CREATE INDEX idx_prompt_invitations_invitee_state ON prompt_invitations(invitee_id, state)`

## Phase A: Navigation

### 1. Layout — sidebar hidden, FloatingNav per-page

- [ ] `src/routes/(app)/+layout.svelte` — hide sidebar (CSS `display: none`)
- [ ] `src/routes/(app)/+layout.svelte` — do NOT add FloatingNav here (per-page rendering pattern)
- [ ] `src/lib/components/FloatingNav.svelte` — add `default` variant: `[Discover] [Profile+badge]`; increase `.nav-btn` from 40px to 44px (WCAG); add `aria-label` on `<nav>`
- [ ] `src/routes/(app)/conversations/[id]/+page.svelte` — add FloatingNav `variant="default"`
- [ ] `src/routes/(app)/meetings/[id]/+page.svelte` — add FloatingNav `variant="default"`
- [ ] `src/routes/(app)/profile/+page.svelte` — add FloatingNav `variant="default"`
- [ ] `src/routes/(app)/discover/+page.svelte` — add Profile button to existing `variant="discover"`

### 2. Profile button + notification badge on FloatingNav

- [ ] `src/lib/components/FloatingNav.svelte` — add Profile icon button with badge dot (8px circle) on discover + default variants
- [ ] Pass `attentionCount` from layout data to FloatingNav (via page data or prop)
- [ ] Badge CSS: `position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; background: var(--color-danger)`

### 3. Sign out moved to profile + feedback page

- [ ] `src/routes/(app)/profile/+page.svelte` — add sign-out link at bottom (de-emphasized, 44px touch target)
- [ ] `src/routes/(app)/feedback/[id]/+page.svelte` — add sign-out link (gated users need access)

### 4. Password config alignment

- [ ] `supabase/config.toml` — change `minimum_password_length` from 6 to 8

## Acceptance Criteria

- [ ] **CRITICAL:** Accepted timeslots NEVER visible to non-participants (RLS enforced)
- [ ] FloatingNav renders on all pages with Profile button + notification badge dot
- [ ] Sidebar hidden (hardcoded)
- [ ] Sign out on profile page and feedback page
- [ ] Touch targets 44px on FloatingNav
- [ ] Password config aligned to 8
- [ ] `svelte-check --threshold error` passes
- [ ] Migrations apply cleanly on `supabase db reset`

## Sources

Extracted from: `docs/plans/2026-03-28-feat-v01-session3-navigation-frontend-polish-plan.md` — Phase 0 + Phase A + Item 12
