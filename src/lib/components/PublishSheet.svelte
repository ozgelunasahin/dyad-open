<script lang="ts">
	import { fly } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import { getWeekDates } from '$lib/utils/dates';
	import LocationSearch from '$lib/components/LocationSearch.svelte';
	import type { LocationRef, TimeSlotInput } from '$lib/domain/types';

	interface Props {
		onClose: () => void;
		onPublish: (slots: TimeSlotInput[]) => void;
		publishing?: boolean;
		error?: string;
	}

	let { onClose, onPublish, publishing = false, error = '' }: Props = $props();

	const weekDates = getWeekDates();
	let selectedDays = $state<Set<string>>(new Set());

	interface SlotDraft {
		time: string;
		duration: number;
		location: LocationRef | null;
	}

	// Per-day slot drafts: Map<date, SlotDraft[]>
	let daySlots = $state<Map<string, SlotDraft[]>>(new Map());

	function toggleDay(date: string) {
		const next = new Set(selectedDays);
		if (next.has(date)) {
			next.delete(date);
			const nextSlots = new Map(daySlots);
			nextSlots.delete(date);
			daySlots = nextSlots;
		} else {
			next.add(date);
			const nextSlots = new Map(daySlots);
			nextSlots.set(date, [{ time: '09:00', duration: 60, location: null }]);
			daySlots = nextSlots;
		}
		selectedDays = next;
	}

	function addTimeSlot(date: string) {
		const current = daySlots.get(date) ?? [];
		if (current.length >= 3) return;
		const nextSlots = new Map(daySlots);
		nextSlots.set(date, [...current, { time: '09:00', duration: 60, location: null }]);
		daySlots = nextSlots;
	}

	function updateSlot(date: string, index: number, field: keyof SlotDraft, value: any) {
		const current = daySlots.get(date);
		if (!current) return;
		const updated = [...current];
		updated[index] = { ...updated[index], [field]: value };
		const nextSlots = new Map(daySlots);
		nextSlots.set(date, updated);
		daySlots = nextSlots;
	}

	function handlePublish() {
		const slots: TimeSlotInput[] = [];
		for (const [date, drafts] of daySlots) {
			for (const draft of drafts) {
				if (!draft.location) continue;
				slots.push({
					start_time: new Date(`${date}T${draft.time}`).toISOString(),
					duration_minutes: draft.duration,
					location: draft.location
				});
			}
		}
		onPublish(slots);
	}

	// Lock body scroll
	let prevOverflow = '';
	onMount(() => {
		prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
	});
	onDestroy(() => {
		document.body.style.overflow = prevOverflow;
	});

	// Time options (7:00 AM to 10:00 PM in 30-min increments)
	const timeOptions = (() => {
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

	function formatDayHeader(date: string): string {
		const d = new Date(date + 'T12:00:00');
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="backdrop" onclick={onClose}>
	<div
		class="sheet"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		transition:fly={{ y: 200, duration: 280 }}
	>
		<button class="sheet-close" onclick={onClose} aria-label="Close">&times;</button>

		<h2 class="sheet-title">Publish as a Conversation</h2>
		<p class="sheet-subtitle">Pick days, then set time and place for each.</p>
		<p class="sheet-note">We only show the address to those you agree to meet.</p>

		<!-- Day picker -->
		<p class="label">Select days</p>
		<div class="day-picker">
			{#each weekDates as day}
				<button
					class="day-cell"
					class:selected={selectedDays.has(day.date)}
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
					{#if (daySlots.get(date)?.length ?? 0) < 3}
						<button class="add-time" onclick={() => addTimeSlot(date)}>+ add time</button>
					{/if}
				</div>

				{#each daySlots.get(date) ?? [] as slot, i}
					<div class="slot-config">
						<div class="slot-time-row">
							<select
								class="time-select"
								value={slot.time}
								onchange={(e) => updateSlot(date, i, 'time', (e.target as HTMLSelectElement).value)}
							>
								{#each timeOptions as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>

							<span class="for-label">for</span>

							<select
								class="duration-select"
								value={slot.duration}
								onchange={(e) => updateSlot(date, i, 'duration', Number((e.target as HTMLSelectElement).value))}
							>
								<option value={30}>30 min</option>
								<option value={45}>45 min</option>
								<option value={60}>1 hour</option>
								<option value={90}>1.5 hours</option>
							</select>
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

		<div class="sheet-footer">
			<button
				class="publish-btn"
				onclick={handlePublish}
				disabled={publishing || selectedDays.size === 0}
			>
				{publishing ? 'Publishing...' : 'Publish'}
			</button>
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
	}

	.sheet-close:hover { color: var(--text-primary); }

	.sheet-title {
		font-size: var(--text-2xl);
		font-weight: normal;
		color: var(--text-primary);
		margin: 0 0 var(--space-1);
	}

	.sheet-subtitle {
		font-size: var(--text-base);
		color: var(--text-muted);
		margin: 0 0 var(--space-2);
	}

	.sheet-note {
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0 0 var(--space-5);
		font-family: var(--font-mono);
		letter-spacing: 0.02em;
	}

	.label {
		font-size: var(--text-base);
		color: var(--text-muted);
		margin: 0 0 var(--space-2);
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

	.day-cell.selected {
		background: var(--text-primary);
		color: var(--bg-canvas);
		border-color: var(--text-primary);
	}

	.day-name { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.04em; }
	.day-num { font-size: var(--text-md); font-weight: 600; line-height: 1; }

	.day-section {
		margin-bottom: var(--space-4);
		padding: var(--space-3);
		border: 1px solid var(--border-link);
		border-radius: var(--radius-input);
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
	}

	.for-label {
		font-size: var(--text-base);
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.publish-error {
		font-size: var(--text-sm);
		color: var(--color-danger);
		margin: var(--space-2) 0;
	}

	.sheet-footer {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--space-4);
	}

	.publish-btn {
		font-size: var(--text-base);
		padding: var(--space-3) 28px;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: 1px solid var(--text-primary);
		border-radius: var(--radius-input);
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.publish-btn:hover:not(:disabled) { opacity: var(--opacity-hover-btn); }
	.publish-btn:disabled { opacity: var(--opacity-disabled); cursor: not-allowed; }

	@media (min-width: 768px) {
		.backdrop {
			align-items: center;
		}

		.sheet {
			border-radius: var(--radius-card);
			max-height: 70vh;
		}
	}
</style>
