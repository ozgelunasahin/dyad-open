---
title: "feat: v0.1 Session 3 — Navigation + Frontend Polish"
type: feat
status: active
date: 2026-03-28
origin: docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md
---

# v0.1 Session 3: Navigation + Frontend Polish

Make the UX representative for alpha testers. Navigation works on all viewports, key flows are polished, safeguarding rules enforced.

(see brainstorm: `docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md` — Session 3)

## Enhancement Summary

**Deepened on:** 2026-03-28
**Agents used:** security-sentinel, architecture-strategist, code-simplicity-reviewer, performance-oracle, best-practices-researcher (x2), framework-docs-researcher, solution-docs-analyst

### Key Improvements from Research
1. **CRITICAL security fix required first:** RLS on `time_slots` must hide accepted slots from non-participants — current policies allow direct API access to confirmed meeting times/locations (stalking vector)
2. **Simplified nav architecture:** Each page renders its own FloatingNav variant (no layout-level nav with opt-out — contradicts project's documented pattern)
3. **Simplified for alpha:** Hardcode sidebar=hidden, client-side `isAvailable()` for expired slots, use `confirm()` for cancellation, skip notification writes
4. **Archive must be atomic:** New `archive_prompt` RPC that cancels pending invitations in the same transaction
5. **Notification INSERT inside RPC:** Current RLS blocks cross-user inserts — cancellation notification must go inside `cancel_meeting` SECURITY DEFINER function

### New Considerations Discovered
- Request waterfall is 7 sequential DB round-trips before discover renders — add index on `prompt_invitations(invitee_id, state)` now, plan RPC consolidation for v0.2
- Migrate `$app/stores` → `$app/state` (deprecated since SvelteKit 2.12)
- Touch targets must be 44px minimum (currently 40px on `.nav-btn`)
- Berlin distance: use pre-computed constant (`LON_SCALE = cos(52.52°) ≈ 0.609`), zero trig calls per invocation
- Map snapshot preservation (`export const snapshot`) must survive discover page changes

---

## Pre-Session Security Fix (MUST DO FIRST)

**Finding:** RLS policies on `time_slots` allow any authenticated user to SELECT accepted slots via direct Supabase REST API (`/rest/v1/time_slots_public?accepted=eq.true`). This reveals confirmed meeting times and approximate locations — a stalking vector for a platform facilitating in-person meetings between strangers.

(see: security-sentinel finding #1, CRITICAL severity)

### New migration: fix `time_slots` RLS

```sql
-- Replace existing authenticated SELECT policy on time_slots
DROP POLICY "Authenticated users can read slots of published prompts" ON time_slots;

CREATE POLICY "Authenticated users read available slots of published prompts"
  ON time_slots FOR SELECT TO authenticated
  USING (
    -- Authors always see their own slots
    EXISTS (
      SELECT 1 FROM prompts
      WHERE prompts.id = time_slots.prompt_id
      AND prompts.author_id = (SELECT auth.uid())
    )
    OR (
      -- Non-authors see only unaccepted slots of published prompts
      accepted = FALSE
      AND EXISTS (
        SELECT 1 FROM prompts
        WHERE prompts.id = time_slots.prompt_id
        AND prompts.state = 'published'
      )
    )
    OR (
      -- Meeting participants can see their accepted slot
      accepted = TRUE
      AND EXISTS (
        SELECT 1 FROM meetings
        WHERE meetings.slot_id = time_slots.id
        AND (SELECT auth.uid()) IN (meetings.participant_a, meetings.participant_b)
      )
    )
  );
```

Also add `.eq('accepted', false)` to `getPromptDetail` in `prompt-query.ts` as defense-in-depth.

- [ ] `supabase/migrations/YYYYMMDD_fix_time_slots_rls_safeguarding.sql` — new RLS policy
- [ ] `src/lib/services/prompt-query.ts` — add `.eq('accepted', false)` to detail slot query
- [ ] Verify: same fix on anon policy if one exists

---

## Dependencies on Prior Sessions

| Session 3 item | Depends on | Status |
|---|---|---|
| Sidebar toggle | No config table exists (Session 2 also dropped it) | **Hardcode hidden for alpha** |
| Fully-booked visibility | No config table exists | **Show all for alpha** |
| Meeting cancellation working | Session 1: column name fixes (B3) | PR #63 **merged** |
| Notification badge accuracy | Session 1: `reviewer_id` fix in layout server | PR #63 **merged** |
| Safeguarding slot visibility | Pre-session security fix (above) | New |

**Implication:** Security fix first, then all items can start. Session 1 is complete. No config table dependency — both Session 2 and Session 3 hardcode defaults for alpha.

## Items

### 1. Layout restructuring — FloatingNav per-page, sidebar hardcoded hidden

**Current state:** Sidebar in `(app)/+layout.svelte` (180px, sticky, hidden below 430px). FloatingNav rendered inside individual page components — not from the layout.

**Change:** Sidebar hidden by default (hardcoded, no `app_config` query for alpha). FloatingNav stays per-page — each page that needs nav renders its own variant. This follows the project's documented pattern in `docs/solutions/ux-patterns/sveltekit-route-groups-for-layout-isolation.md`.

#### Research Insights

**Architecture strategist:** Rendering FloatingNav from the layout with child opt-out creates inverted dependency (layout knows about children) and two components fighting for the same viewport position. The project's own solution doc says: "Conditional layout logic is fragile and inverts the dependency."

**Simplicity reviewer:** Just check `$page.route.id` in the layout if you need route-aware behaviour. But even simpler: let each page render its own nav.

**Best practices:** Migrate `$app/stores` → `$app/state` (deprecated since SvelteKit 2.12). Use `page.route.id` (not `page.url.pathname`) for route checks — route IDs are stable across parameter changes.

**Nav variant strategy:**
- **`default` variant** (new): `[Discover] [Profile+badge]` — rendered by conversation detail, meeting detail, profile pages
- **`discover` variant** (existing): `[Map] [Calendar] [Search] [+] [Profile+badge]` — rendered by discover page
- **`editor` variant** (existing, in `(editor)` layout group): `[Back] [Save] [Continue]` — unchanged

**Files:**
- [ ] `src/lib/components/FloatingNav.svelte` — add `default` variant with Discover + Profile buttons; increase `.nav-btn` from 40px to 44px (WCAG 2.5.8); add `aria-label` on `<nav>` element
- [ ] `src/routes/(app)/+layout.svelte` — hide sidebar (CSS `display: none` or remove from markup); do NOT add FloatingNav here
- [ ] `src/routes/(app)/+layout.svelte` — migrate `$app/stores` → `$app/state`
- [ ] `src/routes/(app)/conversations/[id]/+page.svelte` — add FloatingNav `variant="default"`
- [ ] `src/routes/(app)/meetings/[id]/+page.svelte` — add FloatingNav `variant="default"`
- [ ] `src/routes/(app)/profile/+page.svelte` — add FloatingNav `variant="default"`
- [ ] `src/routes/(app)/discover/+page.svelte` — keep existing `variant="discover"`, add Profile button

**Edge case — feedback gate sign-out:** When sidebar is hidden, gated users have no sign-out. Add `<a href="/logout">Sign out</a>` to feedback page. One line, not an engineering task.

- [ ] `src/routes/(app)/feedback/[id]/+page.svelte` — add sign-out link at bottom

**Edge case — logo:** Accept absence for alpha. Sidebar can be re-enabled via admin toggle when a config table is built (v0.2).

**Edge case — admin access:** Session 2 adds an "Admin" link to the sidebar. When sidebar is hidden, admin accesses `/admin` via direct URL (acceptable for single admin user at alpha). If Session 2's `isAdmin` flag is in layout data, optionally add admin icon to FloatingNav `default` variant.

#### z-index Reference (from solution docs)

| Layer | z-index | Component |
|-------|---------|-----------|
| Page content | 1-199 | Normal flow |
| Leaflet tiles | 200-599 | Map |
| BottomSheet backdrop | 600 | Map overlay |
| FloatingNav + Leaflet controls | 800 | Navigation |
| Mobile overlay + panel | 1000-1001 | Search, modals |

Any new overlays must respect this hierarchy.

### 2. FloatingNav Profile button + notification badge

**Current state:** `attentionCount` computed in layout server from pending invitations + due feedback. Badge renders on sidebar Profile link only.

**Change:** Add Profile button to FloatingNav (discover + default variants). Show notification badge.

#### Research Insights

**Simplicity reviewer:** Skip adding cancelled meetings to badge count for alpha — cancelled meetings are rare among motivated testers. Show them on profile page directly.

**Best practices:** Use `depends('app:attention-count')` for targeted invalidation. After form actions that change invitation/feedback state, call `invalidate('app:attention-count')`. Badge dot (8px circle) is better than a number for the compact FloatingNav. Add screen-reader text: `<span class="sr-only">{count} notifications</span>`.

**Performance oracle:** The layout server already runs 3 parallel queries. Adding a 4th is fine at alpha scale. Missing index: `prompt_invitations(invitee_id, state)` — add this now.

**Files:**
- [ ] `src/lib/components/FloatingNav.svelte` — add Profile icon button with badge dot (discover + default variants)
- [ ] `src/routes/(app)/+layout.server.ts` — add `depends('app:attention-count')`; migrate `$app/stores` → `$app/state` usage
- [ ] `supabase/migrations/YYYYMMDD_add_invitee_state_index.sql` — `CREATE INDEX idx_prompt_invitations_invitee_state ON prompt_invitations(invitee_id, state)`

**Badge CSS pattern:**
```css
.nav-btn { position: relative; }
.badge-dot {
  position: absolute;
  top: 6px; right: 6px;
  width: 8px; height: 8px;
  background: var(--color-danger, #c00);
  border-radius: 50%;
  border: 2px solid rgba(245, 244, 240, 0.96); /* match nav bg */
}
```

### 3. Sign out moved to profile page

**Current state:** Sign out is a link in the sidebar. Not on the profile page.

- [ ] `src/routes/(app)/profile/+page.svelte` — add sign-out link at bottom of page (de-emphasized, `var(--text-muted)`, min-height 44px for touch target)
- [ ] Remove sign-out from sidebar (if sidebar markup remains for future toggle)

### 4. Discover visibility changes

**Current state:** `prompt-query.ts:48` excludes own conversations (`.neq('author_id', userId)`). Line 67 filters `.eq('accepted', false)` — hides slots with accepted invitations, causing fully-booked conversations to disappear.

#### Research Insights

**Simplicity reviewer:** For alpha (<100 users), just remove the `.neq('author_id', userId)` filter. Show all published prompts. Show fully-booked ones too (no admin toggle needed). Existing `isAvailable` filter handles expired slots.

**Discover/safeguarding researcher:** Multiple RLS policies combine with OR — can add visibility policies at DB layer without changing query code. For alpha, post-fetch filtering is fine. For v0.2, create an `available_slots` view with `security_invoker = true`.

**Architecture strategist:** If compound OR logic is needed later, an RPC (`get_discover_feed`) is the right choice. But for alpha, the simplification works.

**Stable sort:** Remove the `soonest_slot` re-sort in TypeScript (lines 106-112 of `prompt-query.ts`). Sort by `published_at` only. The re-sort breaks cursor pagination. For v0.2, push `soonest_slot` computation into a database view.

**Changes (simplified for alpha):**
1. Remove `.neq('author_id', userId)` — show own published conversations
2. Show fully-booked conversations (no admin toggle)
3. Safeguarding enforced by RLS (pre-session security fix) — confirmed slots invisible to non-participants at database layer
4. Remove `soonest_slot` re-sort for stable ordering

- [ ] `src/lib/services/prompt-query.ts:48` — remove `.neq('author_id', userId)`
- [ ] `src/lib/services/prompt-query.ts:106-112` — remove `soonest_slot` re-sort (keep `published_at` sort from DB)
- [ ] Verify: RLS fix (pre-session) prevents confirmed slot leakage on all code paths

### 5. Conversation detail UX

**Current state:** No neighbourhood in meta, no explainer text, invitation note is single-line `<input>`, no past-slot handling, no edit link for author, back link shows full text.

#### Research Insights

**Simplicity reviewer:** Client-side `isAvailable(slot, new Date())` already exists in `$lib/domain/time-slot.ts`. Return all slots from server, filter client-side for display. No server changes needed.

**Architecture strategist:** Do NOT mix expired slots into `available_slots`. Either add a separate `expired_slots` array to `PromptDetail`, or return all slots and let the frontend classify them with `isAvailable()`.

**Solution docs:** Cancellation/archive confirmation should stay inline (not routed) — it's a simple confirmation, not a multi-step form. `confirm()` is fine for alpha.

**Changes (all in `src/routes/(app)/conversations/[id]/+page.svelte` unless noted):**

- [ ] Show neighbourhood next to username and date: `@mira · Thu, Mar 26 · Neukölln`
- [ ] Add explainer text before response area: "If this is a conversation you want to have, respond to unlock invitation"
- [ ] Change invitation note from `<input>` to `<textarea>` — position ABOVE the "Send invitation" button with placeholder "Add a note (optional)"
- [ ] After sending invitation: show all slots, mark the invited slot as "Invited" + greyed out (not hiding other slots)
- [ ] Spacing fix: `margin-bottom: var(--space-4)` between response section and slots
- [ ] Remove "← back to discover" text link (rely on browser back + FloatingNav)
- [ ] Past/expired slots: return all slots from server, classify client-side with `isAvailable()`. Render expired slots with "This time has passed" and disable selection. **No server changes.**
- [ ] Author view: add "Edit" link to own published conversation (links to `/conversations/[id]/edit`)
- [ ] Author view: add "Archive" button — uses `confirm()` for alpha ("Archiving will expire pending invitations. Continue?")

### 6. Archive must cancel pending invitations (NEW — security finding)

**Finding:** The `unpublish` method in `prompt-command.ts` transitions prompt state but does NOT cancel pending invitations. Phantom invitations remain, and an invitee could accept an invitation for an archived prompt.

(see: security-sentinel finding #3, HIGH severity)

**Fix:** Create an `archive_prompt` RPC that atomically archives the prompt AND expires pending invitations:

```sql
CREATE OR REPLACE FUNCTION archive_prompt(p_prompt_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM prompts
    WHERE id = p_prompt_id AND author_id = (SELECT auth.uid()) AND state = 'published'
  ) THEN
    RAISE EXCEPTION 'Not found or not archivable';
  END IF;

  -- Expire all pending invitations for this prompt's slots
  UPDATE prompt_invitations SET state = 'expired', resolved_at = NOW()
  WHERE slot_id IN (SELECT id FROM time_slots WHERE prompt_id = p_prompt_id)
    AND state = 'pending';

  -- Archive the prompt
  UPDATE prompts SET state = 'archived', archived_at = NOW()
  WHERE id = p_prompt_id;
END; $$;
```

- [ ] `supabase/migrations/YYYYMMDD_archive_prompt_rpc.sql` — create `archive_prompt` RPC
- [ ] `src/lib/services/prompt-command.ts` — update `unpublish` to call `archive_prompt` RPC

### 7. Map pin click — fuzz region, not Bezirk

**Current state:** `MapView.svelte:89-96` filters `p.area === pin.area` (string match on neighbourhood). Shows ALL conversations in the same Bezirk.

#### Research Insights

**Framework docs:** Pre-computed Berlin constant eliminates all trig calls:

```typescript
const BERLIN_LAT_RAD = 52.52 * Math.PI / 180;
const LON_SCALE = Math.cos(BERLIN_LAT_RAD); // ~0.609
const DEG_TO_METERS = 111_320;

function berlinDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dy = (lat2 - lat1) * DEG_TO_METERS;
  const dx = (lon2 - lon1) * DEG_TO_METERS * LON_SCALE;
  return Math.sqrt(dx * dx + dy * dy);
}
```

**Simplicity reviewer:** The existing Euclidean squared-distance pattern in the sort (lines 91-93) can be reused. Just add a threshold check. ~3 lines changed.

**Solution docs:** Map snapshot preservation (`export const snapshot`) must survive discover page changes. Debounce `moveend` events (300ms). Generation counter pattern for marker rebuilds is unaffected.

- [ ] `src/lib/components/MapView.svelte` — replace area string filter with `berlinDistance() < FUZZ_MAX_METERS` (400m)
- [ ] `src/lib/components/BottomSheet.svelte` — remove neighbourhood name as header, use neutral label (e.g., "Nearby" or conversation count)
- [ ] Cover image consistency: align BottomSheet thumbnails (64x64) with discover list (88x96) — use 64x64 square for both

### 8. Profile — meeting cancellation + notification

**Current state:** `meetings/[id]/+page.svelte:20` uses browser `confirm()`. `cancel_meeting` RPC exists. No notification to other party.

#### Research Insights

**Simplicity reviewer:** `confirm()` is fine for alpha. Skip custom modals. Skip the optional cancellation reason textarea — nobody reads it yet.

**Security sentinel:** Notification INSERT must go inside `cancel_meeting` RPC (SECURITY DEFINER). Current RLS policy restricts notification inserts to `auth.uid() = user_id` — a user cannot insert notifications for others. Loosening this would be a security regression. Also: update `notifications_type_check` constraint to include `'meeting_cancelled'`.

**Architecture strategist:** Query cancelled meetings from `meetings` table directly for the profile attention section. Don't write to notifications table AND query meetings table — pick one source of truth. For alpha: query meetings table (simpler). For v0.2: unify into notifications.

**Changes:**
- [ ] Keep `confirm()` for alpha — no custom modal
- [ ] `supabase/migrations/YYYYMMDD_cancel_meeting_notification.sql`:
  - Add `'meeting_cancelled'` to notifications type CHECK constraint
  - Modify `cancel_meeting` RPC to INSERT notification for other participant
- [ ] `src/routes/(app)/profile/+page.svelte` — show cancelled meetings in "Needs your attention" section (query `meetings` where `state = 'cancelled'` and user is participant)
- [ ] Visual distinction between authored conversations and responded-to conversations (CSS class hooks, subtle for alpha)

### 9. Editor — placeholder text

**Current state:** No body placeholder text. The editor has a CSS-only placeholder at line 196-202 of `PromptEditor.svelte`.

#### Research Insights

**Framework docs:** Use `@tiptap/extension-placeholder` with `data-placeholder` CSS attribute. Supports per-node placeholders (heading vs body). Replace the hardcoded `content: 'Start writing...'` CSS.

- [ ] `src/lib/components/PromptEditor.svelte` — add `Placeholder.configure({ placeholder: 'Start writing your conversation...' })` to extensions array; update CSS to use `attr(data-placeholder)`

### 10. Copy changes (inline in components, no copy.ts)

`copy.ts` is deferred to v0.2 (DB-backed i18n). All changes inline.

- [ ] Response placeholder: "Write a response..." → "Write a comment..." (conversation detail)
- [ ] Explainer text before response (conversation detail — item 5)
- [ ] Invite email: "a community of independent thinkers who meet through writing" → inclusive language per design principles
- [ ] Fix relative image paths in email templates: `/images/logo-dark.png` → `https://dyad.berlin/images/logo-dark.png`
- [ ] Date labels: clarify "published on" vs "edited" on conversation detail
- [ ] Past-slot message: "This time has passed" (conversation detail — item 5)

### 11. Responsive audit

Run LAST, after all layout/component changes are complete.

- [ ] Mobile (375px): verify all pages, FloatingNav touch targets (must be 44px), form usability
- [ ] Verify Session 2's feedback "?" button (fixed bottom-right, z-800) does not overlap FloatingNav (bottom-center, z-800, max-width 360px)
- [ ] Tablet (768-1024px): verify FloatingNav positioning, content width
- [ ] Large desktop (2560px+): defer deep audit — verify nothing is broken, accept imperfect
- [ ] Document issues found; fix critical layout breaks within Session 3, defer polish items
- [ ] S6 verification: "New conversation" button visible on all screen sizes

### 12. Password — Supabase config alignment (trivial)

Session 1 fixed frontend + backend to enforce 8. `supabase/config.toml` still says `minimum_password_length = 6`.

- [ ] `supabase/config.toml` — change `minimum_password_length` from 6 to 8

## Implementation Order

```
Phase 0: Security fix (MUST DO FIRST)
  - time_slots RLS: hide accepted slots from non-participants
  - Defense-in-depth: .eq('accepted', false) in getPromptDetail
  - Index: prompt_invitations(invitee_id, state)

Phase A: Navigation (items 1-3) — after Phase 0
  Each page gets its own FloatingNav variant
  Profile button + badge dot
  Sign out on profile + feedback page
  Sidebar hidden (hardcoded)

Phase B: Core pages (items 4-8) — parallel tracks after Phase A
  Track 1: Discover visibility (item 4)
  Track 2: Conversation detail UX (item 5) + Archive RPC (item 6) + Editor (item 9)
  Track 3: Map pin click (item 7)
  Track 4: Profile cancellation + notification (item 8)

Phase C: Copy + Polish (items 10-12) — after Phase B
  10. Copy changes (batch to avoid merge conflicts)
  11. Responsive audit (final pass)
  12. Password config (trivial)
```

Items in Phase B tracks 1-4 are independent and can be parallelised.

## Decisions Made

1. **Sidebar hardcoded hidden for alpha.** No `app_config` dependency. Admin toggle comes post-Session 2. (Simplicity reviewer: "remove the cross-session dependency")
2. **FloatingNav per-page, not from layout.** Each page renders its own variant. Layout stays inert. (Architecture strategist: "contradicts documented pattern"; solution doc: "conditional layout logic is fragile")
3. **After inviting: show all slots, mark invited one.** Don't hide other slots — contradicts "multiple invitations per slot." (SpecFlow finding)
4. **Progressive slot disclosure deferred.** All slots shown for alpha. No teaser. (Readiness plan deferred list)
5. **No copy.ts.** All copy changes inline in components. (Readiness plan deferred list)
6. **Own conversations on discover: published only.** Drafts remain profile-only. (SpecFlow finding)
7. **Cancelled meetings on profile page, not in badge count.** Simpler for alpha. (Simplicity reviewer)
8. **Map fuzz region radius: 400m** (`FUZZ_MAX_METERS`). Pre-computed Berlin constant. (Framework docs)
9. **Feedback-gated users get a sign-out link on the feedback page.** (SpecFlow finding: Q2)
10. **`confirm()` for cancellation and archive.** Custom modals are v0.2. (Simplicity reviewer: "building custom modals for two different flows is avoidable")
11. **Client-side `isAvailable()` for expired slots.** No server changes. (Simplicity reviewer)
12. **Cancellation notification inside `cancel_meeting` RPC.** Never loosen notification INSERT RLS. (Security sentinel: HIGH)
13. **Archive must cancel pending invitations atomically.** New `archive_prompt` RPC. (Security sentinel: HIGH)
14. **RLS on `time_slots` must hide accepted slots.** Defense-in-depth at database layer. (Security sentinel: CRITICAL)

## Open Questions for Implementation

- **Desktop FloatingNav positioning:** Top-anchored (current) or evolve into persistent header? For alpha: keep current bottom-anchored pill, revisit after tester feedback.
- **Cover image crop:** BottomSheet 64x64 square vs discover 88x96 rectangle — recommendation: 64x64 square for both.
- **Discover sort for v0.2:** Move `soonest_slot` computation into a `discover_prompts` database view with compound cursor pagination.

## Acceptance Criteria

- [ ] **CRITICAL:** Accepted timeslots are NEVER visible to non-participants (RLS enforced at database layer)
- [ ] FloatingNav renders on all pages (mobile + desktop) with Profile button and notification badge dot
- [ ] Sidebar is hidden (hardcoded); can be re-enabled post-Session 2 via admin toggle
- [ ] Sign out accessible from profile page and feedback page (when gated)
- [ ] Author's own published conversations appear on discover
- [ ] Conversation detail shows neighbourhood, explainer text, textarea for invitation note
- [ ] Past/expired slots show "This time has passed" (client-side classification, not server change)
- [ ] Author can edit and archive own published conversations from detail page
- [ ] Archiving a conversation atomically cancels all pending invitations
- [ ] Map pin click shows conversations within 400m fuzz region (not entire Bezirk)
- [ ] Meeting cancellation notifies other party (notification row in `cancel_meeting` RPC)
- [ ] Cancelled meetings appear in profile "Needs your attention" section
- [ ] Invite email uses inclusive language, image paths are absolute
- [ ] Touch targets are minimum 44px on FloatingNav buttons
- [ ] All pages functional at 375px and 768px viewports
- [ ] `supabase/config.toml` password minimum is 8
- [ ] "New conversation" button visible on all screen sizes
- [ ] Discover feed has stable sort order (no `soonest_slot` re-sort)

## Performance Notes (v0.2 Preparation)

**Current waterfall:** 7 sequential DB round-trips per authenticated page load (auth session → getUser → gate check → 3 parallel layout queries → page-specific queries).

**Alpha actions (this session):**
- Add index: `prompt_invitations(invitee_id, state)` — missing, causes sequential scan on invitation count

**v0.2 actions (documented as tech debt):**
- Merge gate check + layout counts into single RPC (`get_user_layout_data`) — eliminates 3 round-trips
- Replace `getPublishedPrompts` with `get_discover_feed` RPC — eliminates 2-step fetch + post-fetch filtering
- Move `soonest_slot` computation into `discover_prompts` database view with `security_invoker = true`
- Cache `app_config` server-side with 60s TTL when admin toggle is implemented

## Deferred (not in Session 3)

- Progressive slot disclosure / teaser (deferred per readiness plan)
- Landing page discover embed with map (deferred)
- Waitlist modal (deferred — redirect to /waitlist works)
- BottomSheet non-blocking interaction (deferred — workaround exists)
- Decline invitation button (deferred — ignoring works at alpha scale)
- Email notifications for events (deferred — testers check the app)
- Notifications UI with bell icon and list (v0.2)
- copy.ts / centralized string management (v0.2 DB-backed)
- "Stack of cards" profile preview (v0.2 — profile redesign)
- Custom cancellation/archive modals (v0.2 — `confirm()` for alpha)
- Cancelled meetings in badge count (v0.2 — show on profile page for alpha)
- 2560px+ responsive audit (v0.2 — verify nothing broken, defer polish)

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md](docs/brainstorms/2026-03-28-v01-implementation-sequencing-brainstorm.md) — Session 3
- **Release readiness plan:** [docs/plans/2026-03-28-feat-v01-release-readiness-plan.md](docs/plans/2026-03-28-feat-v01-release-readiness-plan.md) — S3, S6, S7, S8, S12
- **Design system spec:** [docs/design/design-system.md](docs/design/design-system.md) — FloatingNav spec (lines 103-119), layout (lines 86-98)
- **Design reference screenshots:** `docs/design/ref-discover-desktop.png`, `docs/design/ref-profile-desktop.png`

### Solution Docs Applied
- `docs/solutions/ux-patterns/sveltekit-route-groups-for-layout-isolation.md` — FloatingNav variant pattern, layout isolation principle
- `docs/solutions/integration-issues/leaflet-sveltekit-ssr-cleanup-zindex.md` — z-index tiers, marker rebuild pattern
- `docs/solutions/ux-patterns/map-state-preservation-with-sveltekit-snapshots.md` — snapshot must survive discover changes
- `docs/solutions/ux-patterns/extract-inline-modals-to-routes.md` — cancellation stays inline, not routed
- `docs/solutions/architecture/feedback-gate-middleware-pattern.md` — exempt path list needs updating for new routes
- `docs/solutions/security-issues/rls-two-party-visibility-pattern.md` — multiple SELECT policies combine with OR
- `docs/solutions/architecture/rpc-cascading-side-effects.md` — notification INSERT belongs inside cancel_meeting RPC
- `docs/solutions/process/design-system-tokens-before-page-iteration.md` — use tokens, don't hardcode

### Review Agents
- **Security sentinel:** CRITICAL: time_slots RLS, HIGH: archive atomicity, HIGH: notification injection via RLS loosening, MEDIUM: notification type constraint
- **Architecture strategist:** FloatingNav not from layout, discover RPC for v0.2, expired slots as separate array, notification inside RPC
- **Simplicity reviewer:** ~200 LOC saved by hardcoding sidebar, skipping custom modals, client-side isAvailable, skipping badge changes
- **Performance oracle:** 7-hop waterfall, missing invitee_id index, plan RPC consolidation for v0.2
- **Best practices:** $app/state migration, depends() for invalidation, 44px touch targets, sr-only text for badges
- **Framework docs:** Berlin distance constant, TipTap placeholder extension, Supabase .or() with nested and()

### Pending Todos Addressed
- #052 (post-fetch filtering) — acknowledged, deferred to v0.2 RPC
- #073 (extract copy) — deferred to v0.2
- #085 (back nav UX) — back link removed per plan
- #087 (fuzz circles) — not in scope, but fuzz region click is
- #091 (MapView props) — addressed by distance function addition
- #094 (SlotCard layout shift) — not directly addressed, note for responsive audit

### SpecFlow Analysis
- FloatingNav variant strategy (Q1) — resolved: per-page rendering
- Feedback-gate sign-out (Q2) — resolved: sign-out link on feedback page
- Slot visibility contradiction (Q4/Q12) — resolved: show all, mark invited
- Fuzz region radius (Q5) — resolved: 400m with Berlin constant
- Cancellation notification surface (Q7) — resolved: profile attention section, skip badge
- Past-slot server change (Q8) — resolved: no server change, client-side isAvailable
