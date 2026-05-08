<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { onMount, onDestroy, tick } from 'svelte';
	import { getWeekDates } from '$lib/utils/dates';
	import LocationSearch from '$lib/components/LocationSearch.svelte';
	import { copy } from '$lib/copy';
	import type { LocationRef, SubmitSlot, TimeSlot } from '$lib/domain/types';

	// initialSlots is the author-loaded slot set with full LocationRef
	// (exact_location). Pre-fills the day-slot Map when the sheet opens, which
	// covers the unpublish-republish case (slots stay in the DB across the
	// state flip) and the close-then-reopen case once the parent persists via
	// onSave.
	type InitialSlot = TimeSlot & { exact_location?: LocationRef | null };

	interface Props {
		onClose: () => void;
		onPublish?: (slots: SubmitSlot[], audienceScope: string | null) => void;
		onSave?: (slots: SubmitSlot[]) => void;
		initialSlots?: InitialSlot[];
		availableScopes?: Array<{ scope: string; name: string }>;
		region?: string;
		publishing?: boolean;
		saving?: boolean;
		error?: string;
		// Override the primary button text. Defaults to "Publish"/"Publishing..."
		// Used by the read-view "Change times" mount, where Save reads better
		// because removing times is also an option.
		submitLabel?: string;
		submittingLabel?: string;
	}

	let {
		onClose,
		onPublish,
		onSave,
		initialSlots = [],
		availableScopes = [],
		region = 'Berlin',
		publishing = false,
		saving = false,
		error = '',
		submitLabel,
		submittingLabel
	}: Props = $props();

	// Empty string means commons (mapped to audience_scope=NULL upstream).
	let audienceScope = $state<string>('');

	const regionLabel = region.charAt(0).toUpperCase() + region.slice(1);

	const weekDates = getWeekDates();
	let selectedDays = $state<Set<string>>(new Set());

	interface SlotDraft {
		// Stable id for the {#each} key. Index keys cause Svelte to reuse
		// LocationSearch instances across slot reorderings, leaking the previous
		// slot's captured query state into the new position. The id is created
		// when the draft is constructed and never reused.
		id: number;
		// dbId is the existing time_slots row id when this draft came from
		// initialSlots. Submitted via SubmitSlot so the parent can compute
		// edits vs. additions on save. New drafts created in-sheet have no dbId.
		dbId?: string;
		time: string;
		duration: number;
		location: LocationRef | null;
	}

	let nextSlotId = 0;
	function makeSlot(time: string, init?: { dbId?: string; duration?: number; location?: LocationRef | null }): SlotDraft {
		return {
			id: nextSlotId++,
			dbId: init?.dbId,
			time,
			duration: init?.duration ?? 60,
			location: init?.location ?? null
		};
	}

	// Per-day slot drafts: Map<date, SlotDraft[]>
	let daySlots = $state<Map<string, SlotDraft[]>>(new Map());

	// Initialize daySlots and selectedDays from initialSlots on mount. The
	// loader's slot data carries exact_location (LocationRef) so we can
	// reconstruct the form's full state.
	//
	// Past slots are skipped — the form's time picker filters out times that
	// are less than 1 hour in the future, so a past slot's "HH:MM" wouldn't
	// match any option and the select would visually drift from state. The
	// publish RPC's delete-and-replace semantics will clean up the orphan
	// past rows when the author submits the next valid set.
	function hydrateFromInitial() {
		const map = new Map<string, SlotDraft[]>();
		const days = new Set<string>();
		const cutoff = new Date(Date.now() + 60 * 60 * 1000);
		for (const slot of initialSlots) {
			const start = new Date(slot.start_time);
			if (start < cutoff) continue;
			const date = start.toLocaleDateString('sv-SE');
			const time = `${start.getHours().toString().padStart(2, '0')}:${start
				.getMinutes()
				.toString()
				.padStart(2, '0')}`;
			const draft = makeSlot(time, {
				dbId: slot.id,
				duration: slot.duration_minutes,
				location: slot.exact_location ?? null
			});
			const existing = map.get(date) ?? [];
			map.set(date, [...existing, draft]);
			days.add(date);
		}
		daySlots = map;
		selectedDays = days;
	}
	hydrateFromInitial();

	// Default times ladder: morning, afternoon, evening. New slots draw from
	// this list by index, so adding three slots on the same day gives
	// 09:00, 14:00, 19:00 by default rather than three identical 09:00 entries.
	const DEFAULT_TIME_LADDER = ['09:00', '14:00', '19:00'];

	function nextDefaultTime(date: string, existingCount: number): string {
		const valid = timeOptionsForDate(date);
		const ladderPick = DEFAULT_TIME_LADDER[Math.min(existingCount, DEFAULT_TIME_LADDER.length - 1)];
		// Honor the ladder when its pick is still in the valid window for this
		// day; otherwise fall through to the first time the day still allows.
		if (valid.some((opt) => opt.value === ladderPick)) return ladderPick;
		return valid[0]?.value ?? ladderPick;
	}

	// Total slots configured across all days. The 3-slot ceiling is per
	// conversation, not per day — gate every add path on this rather than the
	// per-day count.
	const totalSlotCount = $derived.by(() => {
		let n = 0;
		for (const drafts of daySlots.values()) n += drafts.length;
		return n;
	});

	// Tracks whether the user has touched the sheet's slot state. Drives the
	// save-on-close behavior: closing the sheet without explicit Save / Publish
	// silently persists the in-progress state when dirty (so a closed-before-
	// publish session isn't lost), and is a pure no-op when not dirty.
	let dirty = $state(false);

	function toggleDay(date: string) {
		const next = new Set(selectedDays);
		if (next.has(date)) {
			next.delete(date);
			const nextSlots = new Map(daySlots);
			nextSlots.delete(date);
			daySlots = nextSlots;
		} else {
			// Selecting a new day implies adding one slot. Block when at the
			// 3-slot conversation ceiling.
			if (totalSlotCount >= 3) return;
			next.add(date);
			const nextSlots = new Map(daySlots);
			nextSlots.set(date, [makeSlot(nextDefaultTime(date, 0))]);
			daySlots = nextSlots;
		}
		selectedDays = next;
		dirty = true;
	}

	function addTimeSlot(date: string) {
		if (totalSlotCount >= 3) return;
		const current = daySlots.get(date) ?? [];
		const nextSlots = new Map(daySlots);
		nextSlots.set(date, [...current, makeSlot(nextDefaultTime(date, current.length))]);
		daySlots = nextSlots;
		dirty = true;
	}

	function removeTimeSlot(date: string, index: number) {
		const current = daySlots.get(date);
		if (!current) return;
		const updated = current.filter((_, i) => i !== index);
		const nextSlots = new Map(daySlots);
		if (updated.length === 0) {
			// Removing the last slot deselects the day entirely so the form
			// stays internally consistent (selectedDays = days with at least one slot).
			nextSlots.delete(date);
			const nextDays = new Set(selectedDays);
			nextDays.delete(date);
			selectedDays = nextDays;
		} else {
			nextSlots.set(date, updated);
		}
		daySlots = nextSlots;
		dirty = true;
	}

	function updateSlot<K extends keyof SlotDraft>(
		date: string,
		index: number,
		field: K,
		value: SlotDraft[K]
	) {
		const current = daySlots.get(date);
		if (!current) return;
		const updated = [...current];
		updated[index] = { ...updated[index], [field]: value };
		const nextSlots = new Map(daySlots);
		nextSlots.set(date, updated);
		daySlots = nextSlots;
		dirty = true;
	}

	// Derived: at least one slot exists somewhere with a location set.
	// The Publish button is disabled until this is true (P0 friction fix:
	// validation no longer waits for a click round-trip).
	const hasPublishableSlot = $derived.by(() => {
		for (const drafts of daySlots.values()) {
			for (const draft of drafts) {
				if (draft.location) return true;
			}
		}
		return false;
	});

	// Derived: count of slots with locations missing, for the inline hint.
	const missingLocationCount = $derived.by(() => {
		let count = 0;
		for (const drafts of daySlots.values()) {
			for (const draft of drafts) {
				if (!draft.location) count++;
			}
		}
		return count;
	});

	function collectSlots(): SubmitSlot[] {
		// Returns every draft including those without a location set. Callers
		// decide what to do with location-less drafts:
		// - Publish path: filter them out (publish requires LocationRef per slot)
		// - Save path: keep them so existing-slot edits can change day/time
		//   without re-picking location (the loader hides exact_location for
		//   privacy, so reopened sheets show null location for stored slots).
		//   editSlot leaves stored exact_location alone when updates.location
		//   is falsy.
		const slots: SubmitSlot[] = [];
		for (const [date, drafts] of daySlots) {
			for (const draft of drafts) {
				slots.push({
					start_time: new Date(`${date}T${draft.time}`).toISOString(),
					duration_minutes: draft.duration,
					location: draft.location as LocationRef,
					dbId: draft.dbId
				});
			}
		}
		return slots;
	}

	function handlePublish() {
		onPublish?.(collectSlots(), audienceScope || null);
	}

	function handleSave() {
		onSave?.(collectSlots());
	}

	// Close path used by the X button, the backdrop click, and Esc. When the
	// user has touched slot state and onSave is wired, save silently before
	// closing so a closed-before-publish session is preserved. Pure no-op when
	// the sheet is unchanged.
	function handleClose() {
		// Fire save asynchronously (don't await) so the sheet closes instantly.
		// The parent's onSave runs in the background; invalidateAll refreshes
		// page data when it returns. The user sees no close delay.
		if (dirty && onSave && !publishing && !saving) {
			handleSave();
		}
		onClose();
	}

	// Body scroll lock + Esc to close + initial focus management.
	let prevOverflow = '';
	let closeButton: HTMLButtonElement | undefined = $state();

	// Mirror the OS reduced-motion preference into transition durations so
	// Svelte's lifecycle timers shorten with the visual fade. CSS-only
	// `transition-duration: 1ms !important` on the rendered backdrop affects
	// rendering but does not shorten the 280ms Svelte holds the DOM alive
	// for the fly-out — the body scroll-lock would stay active after visual
	// close.
	let reducedMotion = $state(false);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !publishing) {
			e.preventDefault();
			handleClose();
		}
	}

	onMount(async () => {
		prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', handleKeydown);
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		// Move focus to the close button on mount so the dialog has a defined
		// keyboard entry point. tick() lets the binding settle.
		await tick();
		closeButton?.focus();
	});

	onDestroy(() => {
		document.body.style.overflow = prevOverflow;
		document.removeEventListener('keydown', handleKeydown);
	});

	// Time options (7:00 AM to 10:00 PM in 30-min increments).
	const ALL_TIME_OPTIONS: { value: string; label: string }[] = (() => {
		const options: { value: string; label: string }[] = [];
		for (let h = 7; h <= 22; h++) {
			for (const m of [0, 30]) {
				if (h === 22 && m === 30) continue;
				const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
				const hour = h % 12 || 12;
				const ampm = h < 12 ? 'AM' : 'PM';
				const label = `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
				options.push({ value, label });
			}
		}
		return options;
	})();

	// For today, hide times that aren't at least 1 hour in the future. Mirrors
	// the editSlot/publish service-layer guard so the UI never offers a time
	// that would be rejected on submit. For other days, every slot is valid.
	function timeOptionsForDate(date: string): { value: string; label: string }[] {
		const today = new Date();
		const todayKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
		if (date !== todayKey) return ALL_TIME_OPTIONS;
		const cutoff = new Date(Date.now() + 60 * 60 * 1000);
		return ALL_TIME_OPTIONS.filter((opt) => {
			const slotTime = new Date(`${date}T${opt.value}`);
			return slotTime >= cutoff;
		});
	}

	function formatDayHeader(date: string): string {
		const d = new Date(date + 'T12:00:00');
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="backdrop" onclick={handleClose} transition:fade={{ duration: reducedMotion ? 1 : 200 }}>
	<div
		class="sheet"
		role="dialog"
		aria-modal="true"
		aria-labelledby="publish-sheet-title"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		transition:fly={{ y: 200, duration: reducedMotion ? 1 : 280 }}
	>
		<button
			bind:this={closeButton}
			type="button"
			class="sheet-close"
			onclick={handleClose}
			aria-label={copy.editor.closeDialog}>&times;</button>

		<h2 id="publish-sheet-title" class="sheet-title">{copy.editor.publishHeadline}</h2>
		<p class="sheet-subtitle">{copy.editor.dayPickerHint}</p>
		<p class="sheet-note">{copy.editor.privacyNote}</p>
		<div class="day-picker">
			{#each weekDates as day}
				{@const noValidTimes = timeOptionsForDate(day.date).length === 0}
				<button
					type="button"
					class="day-cell"
					class:selected={selectedDays.has(day.date)}
					aria-pressed={selectedDays.has(day.date)}
					disabled={noValidTimes}
					onclick={() => toggleDay(day.date)}
				>
					<span class="day-name">{day.dayShort.toUpperCase()}</span>
					<span class="day-num">{day.dayNum}</span>
				</button>
			{/each}
		</div>

		<!-- Per-day slot config -->
		{#each [...selectedDays].sort() as date}
			<div class="day-section">
				<div class="day-header">
					<span class="day-header-text">{formatDayHeader(date)}</span>
					{#if totalSlotCount < 3}
						<button type="button" class="add-time" onclick={() => addTimeSlot(date)}>{copy.editor.addTime}</button>
					{/if}
				</div>

				{#each daySlots.get(date) ?? [] as slot, i (slot.id)}
					<div class="slot-config">
						<div class="slot-time-row">
							<select
								class="time-select"
								value={slot.time}
								onchange={(e) => updateSlot(date, i, 'time', (e.target as HTMLSelectElement).value)}
							>
								{#each timeOptionsForDate(date) as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>

							<span class="for-label">for</span>

							<select
								class="duration-select"
								value={slot.duration}
								onchange={(e) =>
									updateSlot(date, i, 'duration', Number((e.target as HTMLSelectElement).value))}
							>
								<option value={30}>30 min</option>
								<option value={45}>45 min</option>
								<option value={60}>1 hour</option>
								<option value={90}>1.5 hours</option>
							</select>

							<button
								type="button"
								class="slot-remove"
								onclick={() => removeTimeSlot(date, i)}
								aria-label={copy.editor.removeTimeSlot}>&times;</button>
						</div>

						<LocationSearch
							value={slot.location}
							onChange={(loc) => updateSlot(date, i, 'location', loc)}
							placeholder="Search for a place..."
						/>
					</div>
				{/each}
			</div>
		{/each}

		{#if error}
			<p class="publish-error">{error}</p>
		{/if}

		{#if onPublish && availableScopes.length > 0}
			<label class="audience-picker">
				<span class="audience-label">{copy.editor.audiencePostingTo}</span>
				<select bind:value={audienceScope} disabled={publishing || saving}>
					<option value="">{copy.editor.audienceCommons.replace('{region}', regionLabel)}</option>
					{#each availableScopes as s (s.scope)}
						<option value={s.scope}>{copy.editor.audienceCorner.replace('{name}', s.name)}</option>
					{/each}
				</select>
			</label>
		{/if}

		<div class="sheet-footer">
			{#if selectedDays.size > 0 && !hasPublishableSlot}
				<p id="publish-hint" class="footer-hint">
					{missingLocationCount === 1
						? copy.editor.setPlaceForOneSlot
						: copy.editor.setPlaceForAtLeastOneSlot}
				</p>
			{/if}
			{#if onPublish}
				<button
					type="button"
					class="btn-primary"
					onclick={handlePublish}
					disabled={publishing || saving || !hasPublishableSlot}
					aria-describedby="publish-hint"
				>
					{publishing
						? (submittingLabel ?? copy.editor.publishing)
						: (submitLabel ?? copy.editor.publishButton)}
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 900;
		background: rgba(0, 0, 0, 0.3);
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.sheet {
		position: relative;
		background: var(--bg-canvas);
		border-radius: var(--radius-card) var(--radius-card) 0 0;
		box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.18);
		width: 100%;
		max-width: 480px;
		max-height: 85vh;
		overflow-y: auto;
		padding: var(--space-6) var(--space-5);
		box-sizing: border-box;
	}

	.sheet-close {
		position: absolute;
		top: var(--space-4);
		right: var(--space-4);
		font-size: var(--text-2xl);
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: var(--space-1);
		line-height: 1;
	}

	.sheet-close:hover { color: var(--text-primary); }

	.sheet-title {
		font-size: var(--text-lg);
		font-weight: 500;
		color: var(--text-primary);
		line-height: var(--leading-tight);
		margin: 0 0 var(--space-1);
	}
	.sheet-subtitle {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin: 0;
	}


	.sheet-note {
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0 0 var(--space-5);
	}

	.day-picker {
		display: flex;
		gap: var(--space-1);
		margin-bottom: var(--space-5);
	}

	.day-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--space-2) 0;
		flex: 1;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		cursor: pointer;
		font-family: inherit;
		color: var(--text-primary);
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.day-cell:hover:not(:disabled) { border-color: var(--border-link-hover); }

	.day-cell:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.day-cell.selected {
		background: var(--bg-control);
		border-color: var(--text-primary);
		color: var(--text-primary);
	}

	.day-name { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.04em; }
	.day-num { font-size: var(--text-md); font-weight: 600; line-height: 1; }

	.day-section + .day-section {
		margin-top: var(--space-5);
		padding-top: var(--space-5);
		border-top: 1px solid var(--border-subtle);
	}

	.day-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-3);
	}

	.day-header-text {
		font-size: var(--text-base);
		font-weight: 500;
		color: var(--text-primary);
	}

	.add-time {
		font-size: var(--text-sm);
		color: var(--text-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.add-time:hover { color: var(--text-primary); }

	.slot-config {
		margin-bottom: var(--space-3);
	}

	.slot-config:last-child { margin-bottom: 0; }

	.slot-time-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.time-select, .duration-select {
		font-size: var(--text-sm);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: transparent;
		color: var(--text-primary);
		flex: 1;
		min-width: 0;
	}

	.for-label {
		font-size: var(--text-sm);
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.slot-remove {
		font-size: var(--text-md);
		line-height: 1;
		color: var(--text-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--space-1) var(--space-2);
		flex-shrink: 0;
	}

	.slot-remove:hover { color: var(--text-primary); }

	.publish-error {
		font-size: var(--text-sm);
		color: var(--color-danger);
		margin: var(--space-2) 0;
	}

	.audience-picker {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		margin: var(--space-4) 0 0;
	}
	.audience-label {
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
	.audience-picker select {
		font-family: inherit;
		font-size: var(--text-sm);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
		background: var(--bg-canvas);
	}

	.sheet-footer {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-2);
		padding: var(--space-4) 0 0;
		position: sticky;
		bottom: 0;
		background: var(--bg-canvas);
		margin-top: var(--space-5);
	}

	.footer-hint {
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0;
	}

	/* .btn-primary lives in shared.css */

	@media (min-width: 768px) {
		.backdrop {
			align-items: center;
		}

		.sheet {
			border-radius: var(--radius-card);
			max-height: 70vh;
		}
	}

	/* prefers-reduced-motion is handled in JS by passing reducedMotion into
	   the fly+fade transitions, so Svelte's lifecycle timer shortens with the
	   visual fade. CSS-only `transition-duration: 1ms !important` would
	   shorten the rendering but leave the body scroll-lock active for 280ms
	   after visual close. */
</style>
