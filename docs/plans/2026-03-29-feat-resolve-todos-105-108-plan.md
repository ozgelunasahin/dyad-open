---
title: "feat: Resolve todos 105-108 (maps link, calendar, admin nav, profile nav)"
type: feat
status: active
date: 2026-03-29
---

# Resolve Todos 105-108

Four small UI improvements across meeting detail, admin panel, and profile navigation.

## Todo 105 — Meeting location as maps link

Wrap exact location in an anchor that opens Google Maps.

### Changes

#### `src/lib/components/SlotCard.svelte`

Expand `exactLocation` prop type to include `lat`/`lng`, wrap in `<a>`:

```svelte
<!-- Props interface, line 11 -->
exactLocation?: { name: string; address: string; lat?: number; lng?: number } | null;

<!-- Template, lines 50-55 -->
{#if exactLocation}
  <a
    class="slot-location"
    href={exactLocation.lat ? `https://www.google.com/maps/search/?api=1&query=${exactLocation.lat},${exactLocation.lng}` : undefined}
    target="_blank"
    rel="noopener"
  >
    <span class="slot-location-name">{exactLocation.name}</span>
    <span class="slot-location-address">{exactLocation.address}</span>
  </a>
{/if}
```

#### `src/routes/(app)/meetings/[id]/+page.svelte`

Wrap location value (lines 48-53) in an anchor:

```svelte
{#if 'exact_location' in data.meeting && data.meeting.exact_location}
  <div class="detail-row">
    <span class="label">{copy.meeting.location}</span>
    <a
      class="value location"
      href="https://www.google.com/maps/search/?api=1&query={data.meeting.exact_location.lat},{data.meeting.exact_location.lng}"
      target="_blank"
      rel="noopener"
    >
      {data.meeting.exact_location.name}<br />
      <span class="addr">{data.meeting.exact_location.address}</span>
    </a>
  </div>
{/if}
```

Style the link to inherit color with subtle underline on hover (design tokens).

---

## Todo 106 — Meeting time as "Add to calendar" .ics link

Generate a downloadable `.ics` file from meeting data.

### Changes

#### `src/lib/utils/calendar.ts` (new file)

```typescript
export function generateICS(opts: {
  title: string;
  start: string;       // ISO 8601
  durationMinutes: number;
  location?: string;
  description?: string;
}): string {
  const start = new Date(opts.start);
  const end = new Date(start.getTime() + opts.durationMinutes * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//dyad.berlin//meeting//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${opts.title}`,
    opts.location ? `LOCATION:${opts.location}` : '',
    opts.description ? `DESCRIPTION:${opts.description}` : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
}

export function downloadICS(ics: string, filename: string): void {
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

#### `src/routes/(app)/meetings/[id]/+page.svelte`

Add an "Add to calendar" link below the time (line 36):

```svelte
<span class="meeting-when">{formatDate(data.meeting.scheduled_time)}</span>
<button class="calendar-link" onclick={handleAddToCalendar}>
  {copy.meeting.addToCalendar}
</button>
```

Only show for `state === 'scheduled'` (no point adding past/cancelled meetings to calendar).

#### `src/lib/copy.ts`

Add to `meeting` section:

```typescript
addToCalendar: 'Add to calendar',
```

---

## Todo 107 — Admin panel back-to-app link

### Changes

#### `src/routes/(admin)/admin/+layout.svelte`

Add a link before the nav tabs (line ~10):

```svelte
<header class="admin-header">
  <a href="/discover" class="back-to-app">&larr; Back to app</a>
  <nav class="admin-tabs">
    <!-- existing tabs -->
  </nav>
</header>
```

Style `.back-to-app` with `font-family: var(--font-mono)`, `font-size: var(--text-xs)`, `color: var(--text-muted)`.

---

## Todo 108 — Profile FloatingNav with +, search, calendar filter

The profile page currently uses `variant="default"` which only shows discover + profile icons. It needs the same action buttons as discover: +, search, and calendar filter.

### Changes

#### `src/lib/components/FloatingNav.svelte`

Add a `profile` variant that renders:
- Discover icon (link to `/discover`)
- Search pill (triggers `onSearchClick`)
- Calendar filter button (with `weekDates`/`selectedDays`/`onToggleDay` — reuse existing date filter panel)
- + button (link to `/conversations/new`)
- Profile icon (active state)

The date filter dropdown (lines 212-230) already exists but is gated to `discover` variant — extend the gate to include `profile`.

#### `src/routes/(app)/profile/+page.svelte`

- Import `getWeekDates` from `$lib/utils/dates.js`
- Add state: `selectedDates`, `searchOpen`, `searchQuery`
- Add filtering logic on the `conversations` derived:
  - **Search**: filter by `item.title` matching `searchQuery` (case-insensitive substring)
  - **Calendar**: filter by `item.sortDate` matching selected dates
- Pass `variant="profile"` and callbacks to FloatingNav

```svelte
<FloatingNav
  variant="profile"
  attentionCount={data.attentionCount ?? 0}
  {weekDates}
  selectedDays={selectedDates}
  onToggleDay={toggleDate}
  showDateFilter={true}
  onSearchClick={() => searchOpen = true}
/>
```

Search overlay can reuse the pattern from discover or be a simpler inline filter input at the top of the conversation list.

---

## Acceptance Criteria

- [x] **105**: Exact location on meeting detail and SlotCard is a tappable Google Maps link
- [x] **106**: "Add to calendar" button on scheduled meeting detail page downloads .ics file
- [x] **107**: Admin panel has a "Back to app" link in the header
- [ ] **108**: Profile FloatingNav shows +, search, and calendar filter buttons
- [ ] **108**: Search filters profile conversations by title
- [ ] **108**: Calendar filter filters profile conversations by date
- [ ] All CSS uses design tokens (no hardcoded values)
- [ ] `svelte-check --threshold error` passes
- [ ] Existing Playwright tests still pass

## Suggested PR grouping

Per the "one plan per PR" convention (~5 checkboxes max):

1. **PR 1**: Todos 105 + 106 + 107 (meeting detail enhancements + admin link — small, independent)
2. **PR 2**: Todo 108 (profile FloatingNav — more complex, touches filtering logic)

## Sources

- `src/lib/domain/types.ts:7-13` — `LocationRef` type (has lat/lng)
- `src/lib/components/SlotCard.svelte:11` — `exactLocation` prop (missing lat/lng)
- `src/routes/(app)/meetings/[id]/+page.svelte:48-53` — location rendering
- `src/routes/(admin)/admin/+layout.svelte:10-13` — admin nav tabs
- `src/lib/components/FloatingNav.svelte:79-134` — discover variant (reference for profile)
- `src/routes/(app)/profile/+page.svelte:235` — current FloatingNav usage
- `docs/solutions/process/design-system-is-a-contract-not-a-reference.md` — all CSS must use tokens
- `docs/solutions/ux-patterns/sveltekit-route-groups-for-layout-isolation.md` — route group + variant pattern
