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
		onclick={(e) => e.stopPropagation()}
		transition:fly={{ y: 200, duration: 280 }}
	>
		<button class="sheet-close" onclick={onClose} aria-label="Close">&times;</button>

		<h2 class="sheet-title">Publish as a Conversation</h2>
		<p class="sheet-subtitle">Pick days, then set time and place for each.</p>

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
		background: var(--bg-canvas, #f5f3f0);
		border-radius: 16px 16px 0 0;
		box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.18);
		width: 100%;
		max-width: 480px;
		max-height: 85vh;
		overflow-y: auto;
		padding: 24px 20px;
		box-sizing: border-box;
	}

	.sheet-close {
		position: absolute;
		top: 16px;
		right: 16px;
		font-size: 22px;
		background: none;
		border: none;
		color: var(--text-muted, #999);
		cursor: pointer;
		padding: 4px;
	}

	.sheet-close:hover { color: var(--text-primary); }

	.sheet-title {
		font-size: 1.3rem;
		font-weight: normal;
		color: var(--text-primary);
		margin: 0 0 4px;
	}

	.sheet-subtitle {
		font-size: 0.85rem;
		color: var(--text-muted, #666);
		margin: 0 0 20px;
	}

	.label {
		font-size: 0.85rem;
		color: var(--text-muted, #666);
		margin: 0 0 8px;
	}

	.day-picker {
		display: flex;
		gap: 4px;
		margin-bottom: 20px;
	}

	.day-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 8px 0;
		flex: 1;
		background: none;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.12));
		border-radius: 8px;
		cursor: pointer;
		font-family: inherit;
		color: var(--text-primary, #1a1a1a);
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.day-cell.selected {
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		border-color: var(--text-primary, #1a1a1a);
	}

	.day-name { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.04em; }
	.day-num { font-size: 0.95rem; font-weight: 600; line-height: 1; }

	.day-section {
		margin-bottom: 16px;
		padding: 12px;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.08));
		border-radius: 8px;
	}

	.day-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.day-header-text {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.add-time {
		font-size: 0.78rem;
		color: var(--text-muted, #666);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.add-time:hover { color: var(--text-primary); }

	.slot-config {
		margin-bottom: 12px;
	}

	.slot-config:last-child { margin-bottom: 0; }

	.slot-time-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.time-select, .duration-select {
		font-size: 13px;
		padding: 8px 10px;
		border: 1px solid var(--border-link, rgba(0, 0, 0, 0.12));
		border-radius: 4px;
		background: transparent;
		color: var(--text-primary);
		flex: 1;
	}

	.for-label {
		font-size: 0.85rem;
		color: var(--text-muted, #666);
		flex-shrink: 0;
	}

	.publish-error {
		font-size: 13px;
		color: #c00;
		margin: 8px 0;
	}

	.sheet-footer {
		display: flex;
		justify-content: flex-end;
		margin-top: 16px;
	}

	.publish-btn {
		font-size: 14px;
		padding: 10px 28px;
		background: var(--text-primary, #1a1a1a);
		color: var(--bg-canvas, #f5f3f0);
		border: 1px solid var(--text-primary);
		border-radius: 6px;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.publish-btn:hover:not(:disabled) { opacity: 0.85; }
	.publish-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	@media (min-width: 768px) {
		.backdrop {
			align-items: center;
		}

		.sheet {
			border-radius: 16px;
			max-height: 70vh;
		}
	}
</style>
