<script lang="ts">
	let {
		canvasId,
		inviteeId,
		inviteeUsername,
		preferredTimeSlots = '',
		onClose,
		onSent
	}: {
		canvasId: string;
		inviteeId: string;
		inviteeUsername: string;
		preferredTimeSlots?: string;
		onClose: () => void;
		onSent: () => void;
	} = $props();

	interface Slot {
		date: string;
		startTime: string;
		duration: number;
		postcode: string;
	}

	// Parse the slots from the canvas's preferred_time_slots JSON
	let parsedSlots = $derived.by(() => {
		try {
			const parsed = JSON.parse(preferredTimeSlots || '{}');
			if (parsed && Array.isArray(parsed.slots)) {
				return parsed.slots.map((s: Record<string, unknown>) => ({
					date: (s.date as string) ?? '',
					startTime: (s.startTime as string) ?? '',
					duration: (s.duration as number) ?? 60,
					postcode: (s.postcode as string) ?? ''
				})) as Slot[];
			}
		} catch { /* ignore */ }
		return [] as Slot[];
	});

	let selectedSlotIndex = $state<number | null>(null);
	let message = $state('');
	let sending = $state(false);
	let errorMsg = $state('');

	function formatSlotLabel(slot: Slot): string {
		const d = new Date(slot.date + 'T12:00:00');
		const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

		let timeStr = '';
		if (slot.startTime) {
			const [h, m] = slot.startTime.split(':').map(Number);
			const start = new Date(2000, 0, 1, h, m);
			timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
		}

		return `${dayStr}, ${timeStr} — ${slot.postcode}`;
	}

	function buildProposedTime(slot: Slot): string {
		const d = new Date(slot.date + 'T12:00:00');
		const dayStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

		let timeStr = '';
		if (slot.startTime) {
			const [h, m] = slot.startTime.split(':').map(Number);
			const start = new Date(2000, 0, 1, h, m);
			timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
		}

		return `${dayStr} at ${timeStr}`;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		// Allow submission without a slot if no slots are available
		if (parsedSlots.length > 0 && selectedSlotIndex === null) return;

		sending = true;
		errorMsg = '';

		const slot = selectedSlotIndex !== null ? parsedSlots[selectedSlotIndex] : null;

		try {
			const res = await fetch('/api/meetings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					canvas_id: canvasId,
					invitee_id: inviteeId,
					location: null,
					proposed_time: slot ? buildProposedTime(slot) : null,
					message: message.trim() || null
				})
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to send invitation');
			}

			onSent();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			sending = false;
		}
	}
</script>

<div class="modal-overlay" onclick={onClose}>
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<h2>Meet @{inviteeUsername}</h2>
		<p class="modal-description">{parsedSlots.length > 0 ? 'Pick a time slot to meet in person.' : 'Send a message to start the conversation.'}</p>

		{#if errorMsg}
			<div class="error-message">{errorMsg}</div>
		{/if}

		<form onsubmit={handleSubmit}>
			{#if parsedSlots.length > 0}
				<div class="form-group">
					<label>Available times</label>
					<div class="slot-chips">
						{#each parsedSlots as slot, i}
							<button
								type="button"
								class="slot-chip"
								class:selected={selectedSlotIndex === i}
								onclick={() => (selectedSlotIndex = i)}
								disabled={sending}
							>
								{formatSlotLabel(slot)}
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<p class="no-slots-text">No time slots set — you can still send a message.</p>
			{/if}

			<div class="form-group">
				<label for="message">Message{parsedSlots.length === 0 ? '' : ' (optional)'}</label>
				<textarea
					id="message"
					bind:value={message}
					placeholder="Tell them why you'd like to meet..."
					rows={3}
					disabled={sending}
					maxlength={500}
				></textarea>
			</div>

			<div class="modal-actions">
				<button type="button" class="cancel-btn" onclick={onClose}>cancel</button>
				<button type="submit" class="submit-btn" disabled={sending || (parsedSlots.length > 0 && selectedSlotIndex === null)}>
					{sending ? 'Sending...' : 'Send invitation'}
				</button>
			</div>
		</form>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1100;
	}

	.modal {
		background: var(--bg-canvas);
		border-radius: 8px;
		padding: 2rem;
		width: 100%;
		max-width: 440px;
		margin: 1rem;
	}

	.modal h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.modal-description {
		margin: 0 0 1.5rem 0;
		color: var(--text-muted);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.error-message {
		background: rgba(220, 53, 69, 0.1);
		border: 1px solid rgba(220, 53, 69, 0.3);
		color: #dc3545;
		padding: 0.75rem 1rem;
		border-radius: 4px;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 0.95rem;
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		transition: border-color 0.2s;
		box-sizing: border-box;
		resize: vertical;
		line-height: 1.5;
	}

	textarea:focus {
		outline: none;
		border-color: var(--text-link-hover);
	}

	textarea:disabled {
		opacity: 0.6;
	}

	.slot-chips {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.slot-chip {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.65rem 0.85rem;
		background: var(--bg-canvas);
		border: 1px solid var(--border-link);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 0.9rem;
		font-family: inherit;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.slot-chip:hover:not(:disabled) {
		border-color: var(--border-link-hover);
	}

	.slot-chip.selected {
		border-color: var(--text-primary);
		background: var(--bg-control, rgba(0, 0, 0, 0.03));
		font-weight: 500;
	}

	.slot-chip:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.no-slots-text {
		color: var(--text-muted);
		font-size: 0.9rem;
		margin: 0 0 1rem;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 0.5rem;
	}

	.cancel-btn {
		padding: 0.65rem 1rem;
		background: none;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		color: var(--text-secondary);
		font-size: 0.95rem;
		font-family: inherit;
		cursor: pointer;
		transition: border-color 0.2s;
	}

	.cancel-btn:hover {
		border-color: var(--border-link-hover);
	}

	.submit-btn {
		padding: 0.65rem 1rem;
		background: var(--text-primary);
		color: var(--bg-canvas);
		border: none;
		border-radius: 4px;
		font-size: 0.95rem;
		font-family: inherit;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
