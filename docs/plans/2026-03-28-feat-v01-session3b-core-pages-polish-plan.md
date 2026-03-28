---
title: "feat: v0.1 Session 3b — Core Pages + Copy + Polish"
type: feat
status: active
date: 2026-03-28
origin: docs/plans/2026-03-28-feat-v01-session3-navigation-frontend-polish-plan.md
---

# v0.1 Session 3b: Core Pages + Copy + Polish

Phase B (core page fixes) + Phase C (copy + responsive audit) from the Session 3 plan. Depends on Session 3a (security + navigation) being merged first.

## Phase B: Core Pages (items 4-9 from parent plan)

### 1. Discover visibility changes

- [ ] `src/lib/services/prompt-query.ts:48` — remove `.neq('author_id', userId)` (show own published conversations)
- [ ] `src/lib/services/prompt-query.ts:106-112` — remove `soonest_slot` re-sort (keep `published_at` sort for stable ordering)
- [ ] Verify: RLS fix (Session 3a) prevents confirmed slot leakage

### 2. Conversation detail UX

All in `src/routes/(app)/conversations/[id]/+page.svelte` unless noted:
- [ ] Show neighbourhood next to username and date: `@mira · Thu, Mar 26 · Neukölln`
- [ ] Add explainer text before response: "If this is a conversation you want to have, respond to unlock invitation"
- [ ] Change invitation note from `<input>` to `<textarea>` — position ABOVE "Send invitation" button
- [ ] After sending: show all slots, mark invited slot as "Invited" + greyed out
- [ ] Spacing fix: `margin-bottom: var(--space-4)` between response section and slots
- [ ] Remove "← back to discover" text link
- [ ] Past/expired slots: classify client-side with `isAvailable()`, show "This time has passed", disable selection
- [ ] Author view: add "Edit" link to own published conversation
- [ ] Author view: add "Archive" button (uses `confirm()` for alpha)

### 3. Archive RPC — atomically cancels pending invitations

- [ ] `supabase/migrations/YYYYMMDD_archive_prompt_rpc.sql` — create `archive_prompt` RPC (verify ownership, expire pending invitations, archive prompt)
- [ ] `src/lib/services/prompt-command.ts` — update `unpublish` to call `archive_prompt` RPC

### 4. Map pin click — fuzz region, not Bezirk

- [ ] `src/lib/components/MapView.svelte` — replace area string filter with `berlinDistance() < FUZZ_MAX_METERS` (400m)
- [ ] `src/lib/components/BottomSheet.svelte` — remove neighbourhood name as header, use neutral label
- [ ] Cover image consistency: 64x64 square for both BottomSheet and discover list

### 5. Profile — meeting cancellation + notification

- [ ] Keep `confirm()` for alpha
- [ ] `supabase/migrations/YYYYMMDD_cancel_meeting_notification.sql` — add `'meeting_cancelled'` to notifications type CHECK, modify `cancel_meeting` RPC to INSERT notification for other participant
- [ ] `src/routes/(app)/profile/+page.svelte` — show cancelled meetings in attention section
- [ ] Visual distinction: authored vs responded-to conversations (CSS class hooks)

### 6. Editor placeholder text

- [ ] `src/lib/components/PromptEditor.svelte` — add `Placeholder.configure()` to TipTap extensions, update CSS

## Phase C: Copy + Polish

### 7. Copy changes (inline, no copy.ts)

- [ ] Response placeholder: "Write a response..." → "Write a comment..."
- [ ] Explainer text (item 2 above)
- [ ] Invite email: inclusive language (replace "independent thinkers who meet through writing")
- [ ] Email image paths: relative → absolute (`https://dyad.berlin/images/logo-dark.png`)
- [ ] Date labels: "published on" / "edited" on conversation detail
- [ ] Past-slot message: "This time has passed"

### 8. Responsive audit (run LAST)

- [ ] Mobile (375px): all pages, FloatingNav touch targets, form usability
- [ ] Verify feedback "?" button doesn't overlap FloatingNav
- [ ] Tablet (768-1024px): FloatingNav positioning, content width
- [ ] Large desktop (2560px+): verify nothing broken (defer polish)
- [ ] S6: "New conversation" button visible on all sizes

## Acceptance Criteria

- [ ] Author's own published conversations on discover
- [ ] Conversation detail: neighbourhood, explainer text, textarea for invite note
- [ ] Past slots show "This time has passed"
- [ ] Author can edit + archive own conversations
- [ ] Archive atomically cancels pending invitations
- [ ] Map pin click: fuzz region (400m), not Bezirk
- [ ] Meeting cancellation notifies other party
- [ ] Cancelled meetings in profile attention section
- [ ] Invite email uses inclusive language, absolute image paths
- [ ] All pages functional at 375px and 768px
- [ ] Discover feed stable sort (no soonest_slot re-sort)

## Sources

Extracted from: `docs/plans/2026-03-28-feat-v01-session3-navigation-frontend-polish-plan.md` — Phase B + Phase C
