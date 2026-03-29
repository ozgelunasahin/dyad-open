---
title: "fix: PR2 — Profile page visual fixes"
type: fix
status: completed
date: 2026-03-29
origin: docs/plans/2026-03-29-fix-design-system-enforcement-plan.md
reviewed: 2026-03-29
---

# PR2: Profile Page Visual Fixes

Specific issues flagged on the profile page. Depends on PR1 (tokens) being merged first.

## Review Findings (2026-03-29)

**Changes from initial plan:**
1. Split green badge fix into two items: background colour + keyframe rgba values.
2. Badge logic tightened: removed conversations card badge entirely (attention section already handles attention items). Meetings card badge kept for upcoming meetings.
3. Action card alignment clarified: PR1 handles token replacement (spacing values). PR2 handles the visual gap between profile card and action cards, and uses `--radius-surface` from PR1.
4. Border-radius resolved: use `--radius-surface` (20px) from PR1. No new token needed in this PR.
5. Sign-out mobile UX (e.g. `@username · Sign out` row) deferred — not design enforcement scope.

## Items

### 1. Fix green badge background colour

Remove wrong `#22c55e` fallback from `.action-card-badge`. The token `var(--color-success)` is already referenced but with a fallback that doesn't match the actual token value (`#3d9e5a`). PR1 strips all fallbacks — this item ensures the badge colour is correct after that.

- [ ] Verify `.action-card-badge` uses `var(--color-success)` with no fallback (PR1 should handle this, verify)

### 2. Fix badge-pulse keyframe rgba values

The `@keyframes badge-pulse` hardcodes `rgba(34, 197, 94, 0.5)` and `rgba(34, 197, 94, 0)` — these are Tailwind green-500, not `--color-success` (#3d9e5a = rgb(61, 158, 90)). Since CSS custom properties can't be used directly in keyframe rgba values, convert the token's colour to matching rgba.

- [ ] Replace `rgba(34, 197, 94, 0.5)` → `rgba(61, 158, 90, 0.5)` in `@keyframes badge-pulse`
- [ ] Replace `rgba(34, 197, 94, 0)` → `rgba(61, 158, 90, 0)` in `@keyframes badge-pulse`

### 3. Unify pulse animation to opacity-based

Current badge pulse uses `box-shadow` ring expansion. Landing page city dot uses `opacity: 1 → 0.4` (2.5s ease-in-out infinite). The badge should match.

- [ ] Replace `@keyframes badge-pulse` with opacity-based animation matching the city dot pattern
- [ ] Adjust timing to 2.5s to match landing page

### 4. Fix badge semantics

The attention section (received invitations, cancelled notifications, feedback due) already handles "needs your attention" items with dedicated cards. Badges on the action cards should not duplicate this signal.

**Conversations card:** Remove the badge entirely. Currently shows when `allConversations.length > 0`, which means it's always on for any user with content. The attention section already surfaces actionable items. A badge that's always on is noise.

**Meetings card:** Keep the existing badge for `upcomingMeetings.length > 0`. Upcoming meetings are time-sensitive — the pulse communicates "something is coming soon." This is not duplicated by the attention section.

- [ ] Remove `{#if allConversations.length > 0}<span class="action-card-badge"></span>{/if}` from conversations card
- [ ] Keep meetings card badge as-is (`upcomingMeetings.length > 0` with pulse)

### 5. Fix action card visual alignment with profile card

PR1 replaces hardcoded spacing values (`gap: 12px`, `padding: 24px 12px 16px`, `gap: 8px`) with tokens. This item addresses the visual relationship between the profile card and the action cards below it — they should read as a cohesive group.

- [ ] Verify profile card `margin-bottom` creates correct visual gap to action cards (currently `--space-5` / 20px)
- [ ] Replace `.action-card` `border-radius: 20px` with `var(--radius-surface)` (PR1 defines this token)
- [ ] Replace `.profile-card` `border-radius: 20px` with `var(--radius-surface)`

### 6. Remove sign-out on desktop

Sidebar already has sign-out. On desktop, the profile page sign-out is redundant. Keep on mobile where there's no sidebar.

- [ ] Wrap `.sign-out-section` in `@media (max-width: 768px)` or equivalent mobile-only display
- [ ] Verify sidebar sign-out is visible and functional on desktop

## Acceptance Criteria

- [ ] Badge colour matches `--color-success` (`#3d9e5a`) — no Tailwind green anywhere on profile page
- [ ] Badge pulse uses opacity animation matching landing page city dot (not box-shadow ring)
- [ ] Conversations card has no badge
- [ ] Meetings card badge shows only when upcoming meetings exist
- [ ] Profile card and action cards use `var(--radius-surface)` (not hardcoded 20px)
- [ ] Sign-out appears once on desktop (sidebar only), visible on mobile (profile page)
- [ ] No new svelte-check errors
