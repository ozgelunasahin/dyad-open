---
title: "feat: Profile FloatingNav full action buttons"
type: feat
status: active
date: 2026-03-30
---

# Profile FloatingNav: Calendar, Search, and + Buttons

The profile FloatingNav currently shows only Discover + Profile links (`variant="default"`). This adds the three missing actions — calendar filter, search, and new conversation — scoped to the profile context.

## Acceptance Criteria

- [ ] **+** button navigates to `/conversations/new` (same as discover)
- [ ] **Search** filters the visible conversation list by title (client-side, no overlay)
- [ ] **Calendar** toggles a meetings-only view, showing only conversations that have an upcoming or active meeting
- [ ] All three buttons follow existing `.nav-btn` sizing (min 44×44px, `--space-2`/`--space-3` padding)
- [ ] `attentionCount` badge dot works correctly on profile (currently always 0 — fix the gap)
- [ ] No hardcoded CSS values — all tokens from `src/app.css`

## Context

Todo #108. Research: `FloatingNav.svelte` lines 81–238, `profile/+page.svelte` line 235.

### Adapted semantics vs discover

| Button | Discover | Profile |
|--------|----------|---------|
| + | → `/conversations/new` | same |
| Search | opens `SearchOverlay` over all public prompts | inline text filter over your conversations |
| Calendar | date-picker filter for slot availability | toggle meetings-only view |

**Why inline filter not SearchOverlay:** `SearchOverlay` expects `PromptSummary[]`; the profile conversation list is `ConversationItem[]`. An inline `$state(searchQuery)` string filtered with `.filter(c => c.title.toLowerCase().includes(...))` is simpler and sufficient.

**Why meetings-only toggle not date-picker:** Profile already shows meetings inline within conversation cards. The calendar button should surface "conversations with an active meeting" as a focused view, not re-implement the slot date-picker (which belongs to discover's availability-browsing use case).

## Implementation

### 1. Add `'profile'` variant to `FloatingNav.svelte`

New props needed (add to existing interface):
```typescript
onCalendarClick?: () => void;
calendarActive?: boolean;     // fills the icon when meetings filter is on
```

Profile variant layout (between `{#if variant === 'default'}...{/if}` blocks):
```
[Discover link] [calendar nav-btn] [search pill flex:1] [+ link] [Profile link + badge]
```

The search pill and + link are structurally identical to the discover variant — extract shared markup or duplicate (duplication is fine for two use sites).

### 2. Wire profile variant in `profile/+page.svelte`

Add reactive state:
```svelte
let searchQuery = $state('');
let meetingsOnly = $state(false);
```

Pass to FloatingNav:
```svelte
<FloatingNav
  variant="profile"
  attentionCount={attentionCount}
  onSearchClick={() => { searchQuery = searchQuery ? '' : ' '; /* focus search */ }}
  onCalendarClick={() => meetingsOnly = !meetingsOnly}
  calendarActive={meetingsOnly}
/>
```

Filter the conversation list before rendering:
```svelte
const visibleConversations = $derived(
  conversations
    .filter(c => !meetingsOnly || c.meeting != null)
    .filter(c => !searchQuery.trim() || c.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
);
```

### 3. Fix attentionCount gap

`data.attentionCount` is undefined in the profile loader. Add to `+page.server.ts` return:
```typescript
attentionCount: receivedInvitations.length + feedbackDue.length + (cancelledNotifications?.length ?? 0)
```

### 4. Search input visibility

When search is active, show a search input above the conversation list (below the profile card, above the attention section). Use `--bg-control`, `--radius-pill`, `--space-3` padding. Auto-focus on open. Clear and collapse when the search pill is tapped again or query is empty and user blurs.

## Files

- `src/lib/components/FloatingNav.svelte` — add `profile` variant + `onCalendarClick`/`calendarActive` props
- `src/routes/(app)/profile/+page.svelte` — wire variant, add `searchQuery`/`meetingsOnly` state, filter conversations, add inline search input
- `src/routes/(app)/profile/+page.server.ts` — add `attentionCount` to return value
- `src/lib/copy.ts` — add `copy.profile.searchPlaceholder` (`'search your conversations'`) if needed

## Sources

- Todo: `todos/108-pending-p1-profile-floatingnav-full-actions.md`
- FloatingNav: `src/lib/components/FloatingNav.svelte:6–238`
- Profile page: `src/routes/(app)/profile/+page.svelte:235`
- Route groups pattern: `docs/solutions/ux-patterns/sveltekit-route-groups-for-layout-isolation.md`
