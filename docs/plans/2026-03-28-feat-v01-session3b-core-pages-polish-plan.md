---
title: "feat: v0.1 Session 3b — Core Pages + Copy + Polish"
type: feat
status: active
date: 2026-03-28
origin: docs/plans/2026-03-28-feat-v01-session3-navigation-frontend-polish-plan.md
reviewed: 2026-03-28
---

# v0.1 Session 3b: Core Pages + Copy + Polish

Phase B (core page fixes) + Phase C (copy + responsive audit) from the Session 3 plan. Depends on Session 3a (security + navigation) being merged first. **Session 3a merged as PR #65.**

## Review Findings (2026-03-28)

Reviewed by: architecture-strategist, security-sentinel, code-simplicity-reviewer, performance-oracle, learnings-researcher.

**Tensions to resolve during implementation:**

1. **Back link:** Design system requires deterministic back links on detail pages (PWA standalone mode has no system back button on iOS). Simplicity reviewer said keep it. Plan originally said remove it. **Resolution: keep back links** — they serve a different purpose than FloatingNav (contextual "where I came from" vs global section switching). Design system updated with PWA context.

2. **Cover image consistency:** Design system says 88x96 for discover list, BottomSheet uses 64x64. Plan says 64x64 square everywhere. **Tension: square is most consistent across responsive breakpoints, but design system hasn't been updated.** Resolve at implementation time — make consistent (square or not), update design system to match.

3. **Neighbourhood in conversation detail meta:** Prompts don't have a neighbourhood field — only time_slots have `general_area`. Derive from slots. If a conversation has slots across multiple neighbourhoods, show distinct areas or the first one.

4. **Past/expired slots:** `getPromptDetail()` currently filters expired slots via `isAvailable()` before they reach the page. To show "This time has passed", either return all slots and classify client-side, or add a separate `expired_slots` array. Service-layer change needed.

5. **`getPublishedPromptsPublic` also has soonest_slot re-sort** (lines 175-179). Both authenticated and public methods should be updated consistently.

6. **Archive RPC:** Security reviewer says needs REVOKE/GRANT, ownership check (`author_id = auth.uid()`), state validation (only from `published`), and `FOR UPDATE` row locking. Simplicity reviewer suggests sequential calls instead (existing `expire_slot_invitations` per-slot + `unpublish()`). **Resolve at implementation time** — RPC is cleaner but sequential calls work for alpha.

7. **Cancel meeting notification:** Simplicity reviewer says defer. But notifications should all follow the same pattern — cancellation is a notification type shown in profile attention section, same as invitations and feedback. Push/email delivery deferred to v0.2 but the notification record should exist. CHECK constraint must be altered BEFORE modifying the RPC.

8. **Map pins represent time_slots, not prompts.** Pins are meeting locations (from slots). A conversation with 3 slots in 3 neighbourhoods shows 3 pins. The distance-based filter groups nearby slots, not nearby prompts. `onSelectPin` callback and BottomSheet `area` prop need updating when `berlinDistance()` replaces area string match.

9. **Editor placeholder:** CSS placeholder already exists (`PromptEditor.svelte:196-201`). If only changing text, a CSS `content:` change suffices — no need for `Placeholder.configure()` unless per-node placeholders are needed.

10. **BottomSheet header:** Remove neighbourhood name — with distance-based grouping, the area string no longer represents the grouping logic. Use a neutral label (e.g., conversation count or "Nearby").

11. **`archive_stale_prompts` cron also doesn't expire invitations.** Latent inconsistency — not blocking for Session 3b but worth noting for future.

12. **Todo #052 (post-fetch filtering)** — the discover query fetches N prompts then filters in JS, causing under-filled pages. Not blocking at alpha scale, tracked for v0.2 RPC.

## Phase B: Core Pages (items 4-9 from parent plan)

### 1. Discover visibility changes

- [ ] `src/lib/services/prompt-query.ts:48` — remove `.neq('author_id', userId)` (show own published conversations)
- [ ] `src/lib/services/prompt-query.ts:106-112` — remove `soonest_slot` re-sort (keep `published_at` sort for stable ordering)
- [ ] Also remove `soonest_slot` re-sort from `getPublishedPromptsPublic` (lines 175-179) for consistency
- [ ] Verify: RLS fix (Session 3a) prevents confirmed slot leakage

### 2. Conversation detail UX

All in `src/routes/(app)/conversations/[id]/+page.svelte` unless noted:
- [ ] Show neighbourhood next to username and date: `@mira · Thu, Mar 26 · Neukölln` (derive from first slot's `general_area`)
- [ ] Update response placeholder to flow-guiding copy (see item 7 for copy decisions)
- [ ] Change invitation note from `<input>` to `<textarea>` — position ABOVE "Send invitation" button
- [ ] After sending: show all slots, mark invited slot as "Invited" + greyed out
- [ ] Spacing fix: `margin-bottom: var(--space-4)` between response section and slots
- [ ] Keep back link (PWA requirement — see review finding #1). Consider making more prominent in `display: standalone` mode.
- [ ] Past/expired slots: return all slots from service layer, classify client-side with `isAvailable()`, show "This time has passed", disable selection. **Note: requires service-layer change** — `getPromptDetail()` currently strips expired slots.
- [ ] Author view: add "Edit" link to own published conversation
- [ ] Author view: add "Archive" button — uses in-app `<dialog>` confirmation (NEVER `confirm()`). Create a reusable `ConfirmDialog.svelte` component.
- [ ] Progressive slot disclosure: before responding, show a teaser ("Available to meet · Neukölln · 1 slot this week"). After responding, reveal full SlotCard components with specific times.

### 3. Archive — atomically cancels pending invitations

- [ ] `supabase/migrations/YYYYMMDD_archive_prompt_rpc.sql` — create `archive_prompt` RPC (verify ownership with `auth.uid()`, only from `published` state, expire pending invitations across all slots, archive prompt). Include REVOKE/GRANT EXECUTE, `SET search_path = public`, `FOR UPDATE` on prompt row.
- [ ] `src/lib/services/prompt-command.ts` — update `unpublish` to call `archive_prompt` RPC
- [ ] **Alternative (simpler for alpha):** call existing `expire_slot_invitations` per-slot inside `unpublish()`, then archive. No new migration. Resolve at implementation time.

### 3b. ConfirmDialog component (NEVER use browser `confirm()`)

All confirmations must use in-app UI. Create a reusable dialog:

- [ ] `src/lib/components/ConfirmDialog.svelte` — native `<dialog>` with `showModal()`, props: `title`, `message`, `confirmLabel`, `onConfirm`. Same pattern as FeedbackModal.
- [ ] Use for: archive conversation, cancel meeting, any future destructive action
- [ ] Replace the `confirm()` call in archive button (item 2) and cancel meeting (item 5)

### 4. Map pin click — fuzz region, not Bezirk

- [ ] `src/lib/components/MapView.svelte` — replace area string filter with `berlinDistance() < FUZZ_MAX_METERS` (400m). Create `berlinDistance()` utility (pre-computed Berlin latitude constant, zero trig calls). Note: pins represent time_slots (meeting locations), not prompts.
- [ ] Update `onSelectPin` callback signature — `area` string param may no longer be meaningful with distance-based grouping
- [ ] `src/lib/components/BottomSheet.svelte` — remove header (no longer needed with distance-based grouping)
- [ ] Cover image consistency: make thumbnails consistent between BottomSheet (64x64) and discover list (88x96). Recommendation: square everywhere. Update design system to match whatever is chosen.

### 5. Profile — meeting cancellation + notification

- [x] Replace browser `confirm()` with `ConfirmDialog` component (item 3b)
- [x] `supabase/migrations/20260410_cancel_meeting_notification.sql`:
  - ALTER notifications type CHECK constraint to include `'meeting_cancelled'` (must be done BEFORE function modification)
  - Modify `cancel_meeting` RPC to INSERT notification for other participant (compute recipient from meeting record, not user input; keep notification `data` payload minimal)
- [x] `src/routes/(app)/profile/+page.svelte` — show cancelled meetings in attention section (query from notifications table, same pattern as other notification types)
- [x] Visual distinction: authored vs responded-to conversations — resolved: profile shows separate groups (Published/Draft/Responded/Archived) with status labels
- [x] **Stack of cards preview** for Conversations and Meetings sections — collapsed preview of top 3 items with gradient fade mask, "Show all N" expand button

### 6. Editor placeholder text

- [x] `src/lib/components/PromptEditor.svelte` — update placeholder text. If only changing text, edit the CSS `content:` string (line 197). Only add `Placeholder.configure()` if per-node placeholders are needed (e.g., different text for heading vs body).

## Phase C: Copy + Polish

### 7. Wire copy.ts into all components

`src/lib/copy.ts` has been created with all user-facing strings. Now wire it into components — replace every hardcoded string with an import from copy.ts. This is the explicit requirement for co-founder independence: changing a word should mean editing one file.

- [x] Wire `copy.conversation.*` into `conversations/[id]/+page.svelte` — placeholders, explainer, invite question, sent text, slot messages
- [x] Wire `copy.nav.*` into back links across all pages
- [x] Wire `copy.profile.*` into `profile/+page.svelte` — section titles, empty states, attention labels
- [x] Wire `copy.meeting.*` into `meetings/[id]/+page.svelte` — cancel button, labels
- [x] Wire `copy.feedback.*` into `feedback/[id]/+page.svelte` — all form copy
- [x] Wire `copy.auth.*` into `login/+page.svelte` and `join/+page.svelte`
- [x] Wire `copy.editor.*` into `PromptEditor.svelte` — placeholder text
- [x] Wire `copy.appFeedback.*` into `FeedbackModal.svelte`
- [ ] Review all strings in copy.ts against `docs/design/domain-language.md` — resolve "response" vs "comment" decision
- [ ] **"Response" vs "comment"** — domain language doc says "response" (intentional, gateway to invitation); co-founder feedback suggests "comment" (more casual). Needs a decision; update `domain-language.md` accordingly.

### 8. Email copy fixes

- [ ] Invite email: inclusive language — already done in this PR (changed to "a community of people in Berlin who meet for real conversations")
- [ ] Email image paths: already done in this PR (absolute URLs)
- [ ] Date labels: "published on" / "edited" on conversation detail — add to copy.ts
- [ ] Past-slot message: "This time has passed" — add to copy.ts

### 9. FloatingNav consistency + discover spacing

**User feedback:** The nav jumps from top (discover) to bottom (other pages) — disorienting. And the first conversation card on discover is too close to the nav at zero scroll.

- [ ] Make FloatingNav position consistent across ALL pages — either all top or all bottom. Recommendation: change the default prop from `'bottom'` to `'top'` in `FloatingNav.svelte` (line 8) so all pages inherit it.
- [ ] Add padding/margin-top to discover list content so first card doesn't sit directly under the nav bar at zero scroll

### 10. Responsive audit (run LAST)

- [ ] Mobile (375px): all pages, FloatingNav touch targets, form usability
- [ ] Verify feedback "?" button doesn't overlap FloatingNav
- [ ] Tablet (768-1024px): FloatingNav positioning, content width
- [ ] Large desktop (2560px+): verify nothing broken (defer polish)
- [ ] S6: "New conversation" button visible on all sizes

## Acceptance Criteria

- [ ] Author's own published conversations on discover
- [ ] Conversation detail: neighbourhood (from slot data), flow-guiding placeholder, textarea for invite note
- [ ] Progressive slot disclosure: teaser before response, full SlotCards after
- [ ] Back link present on detail pages (PWA standalone requirement)
- [ ] Past slots show "This time has passed"
- [ ] Author can edit + archive own conversations
- [ ] Archive cancels pending invitations (atomically or sequentially)
- [ ] All confirmations use in-app `<dialog>` — NO browser `confirm()` anywhere
- [ ] Map pin click: fuzz region (400m), not Bezirk
- [ ] Meeting cancellation creates notification for other party
- [ ] Cancelled meetings in profile attention section
- [ ] Invite email uses inclusive language, absolute image paths
- [ ] Cover image thumbnails consistent across discover list and BottomSheet
- [ ] FloatingNav position consistent (top) across all pages
- [ ] All user-facing strings imported from `src/lib/copy.ts`
- [ ] All pages functional at 375px and 768px
- [ ] Discover feed stable sort (no soonest_slot re-sort, both authenticated and public methods)

## Sources

Extracted from: `docs/plans/2026-03-28-feat-v01-session3-navigation-frontend-polish-plan.md` — Phase B + Phase C

### Review Agents (2026-03-28)
- **Architecture strategist:** `getPublishedPromptsPublic` also needs re-sort removal; archive RPC understates scope (service interface, stale-archive cron); `berlinDistance()` doesn't exist yet; cover image plan contradicts design system; neighbourhood not on prompt object; past slots filtered server-side
- **Security sentinel:** Archive RPC needs REVOKE/GRANT + state validation; CHECK constraint must be altered before function; discover `.neq` removal is safe (double-layered protection); expired unaccepted slots are low-risk
- **Simplicity reviewer:** Sequential calls instead of archive RPC; defer map distance filter; keep back link; CSS placeholder change instead of TipTap extension; BottomSheet area name is useful; visual distinction authored/responded may be unnecessary
- **Performance oracle:** No concerns at alpha scale; existing indexes cover archive RPC; removing soonest_slot sort is product decision not perf; berlinDistance with pre-computed constant is trivial
- **Learnings researcher:** Todo #052 (post-fetch filtering) tracked alongside discover; RPC cascading side effects pattern applies to both archive and cancel notification; map snapshot must survive changes; copy extraction (todo #073) should precede copy changes
