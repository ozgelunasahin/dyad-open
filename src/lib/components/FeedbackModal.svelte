<script lang="ts">
	import { canvasStore } from '$lib/stores/canvas.svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
		canvasId: string;
	}

	let { open, onClose, canvasId }: Props = $props();
	let feedbackType = $state<'bug' | 'feature' | 'other'>('bug');
	let description = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);
	let successTimeoutId: ReturnType<typeof setTimeout> | null = null;
	let lastSubmitTime = 0;
	const RATE_LIMIT_MS = 30000; // 30 seconds between submissions

	// Clean up timeout when component unmounts or modal closes
	$effect(() => {
		return () => {
			if (successTimeoutId) {
				clearTimeout(successTimeoutId);
				successTimeoutId = null;
			}
		};
	});

	function captureContext(): Record<string, unknown> {
		const snapshot = $state.snapshot(canvasStore);
		return {
			cardCount: snapshot.cards.size,
			focusedCardId: snapshot.focusedCardId,
			camera: { x: snapshot.camera.x, y: snapshot.camera.y, zoom: snapshot.camera.zoom },
			userAgent: navigator.userAgent,
			viewport: { width: window.innerWidth, height: window.innerHeight },
			url: window.location.href,
			recentErrors: (window as any).__recentErrors || []
		};
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;

		// Client-side rate limit
		const now = Date.now();
		if (now - lastSubmitTime < RATE_LIMIT_MS) {
			const waitSecs = Math.ceil((RATE_LIMIT_MS - (now - lastSubmitTime)) / 1000);
			error = `Please wait ${waitSecs}s before submitting again`;
			return;
		}

		submitting = true;
		error = null;
		lastSubmitTime = now;

		try {
			const formData = new FormData();
			formData.append('type', feedbackType);
			formData.append('description', description);
			formData.append('canvasId', canvasId);
			formData.append('context', JSON.stringify(captureContext()));

			const response = await fetch('/api/feedback', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || 'Failed to send feedback';
				return;
			}

			// Success
			success = true;
			description = '';
			feedbackType = 'bug';

			// Close after brief delay to show success (timeout is cleaned up on unmount)
			successTimeoutId = setTimeout(() => {
				successTimeoutId = null;
				success = false;
				onClose();
			}, 1500);
		} catch (e) {
			error = 'Network error. Please try again.';
		} finally {
			submitting = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
	<div class="modal-overlay" onclick={onClose}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			{#if success}
				<div class="success-message">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
						<path
							d="M20 6L9 17L4 12"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<span>Thanks for your feedback!</span>
				</div>
			{:else}
				<h2>Send Feedback</h2>

				{#if error}
					<div class="error-message">{error}</div>
				{/if}

				<form onsubmit={handleSubmit}>
					<fieldset>
						<legend>Type</legend>
						<label>
							<input type="radio" name="type" value="bug" bind:group={feedbackType} />
							bug report
						</label>
						<label>
							<input type="radio" name="type" value="feature" bind:group={feedbackType} />
							feature request
						</label>
						<label>
							<input type="radio" name="type" value="other" bind:group={feedbackType} />
							other
						</label>
					</fieldset>

					<label class="description-label">
						Description
						<textarea
							name="description"
							bind:value={description}
							placeholder={feedbackType === 'bug'
								? 'What happened? What did you expect?'
								: 'Describe your idea...'}
							required
							minlength={10}
							maxlength={5000}
							rows={5}
						></textarea>
					</label>

					<div class="modal-actions">
						<button type="button" class="cancel-btn" onclick={onClose}>cancel</button>
						<button
							type="submit"
							class="submit-btn"
							disabled={submitting || description.trim().length < 10}
						>
							{submitting ? 'sending...' : 'send feedback'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}

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
		z-index: 1000;
	}

	.modal {
		background: var(--bg-canvas);
		border-radius: 8px;
		padding: 24px;
		width: 100%;
		max-width: 420px;
		margin: 16px;
	}

	.modal h2 {
		margin: 0 0 16px 0;
		font-size: 1.25rem;
		font-weight: normal;
		color: var(--text-primary);
	}

	.error-message {
		background: rgba(220, 53, 69, 0.1);
		border: 1px solid rgba(220, 53, 69, 0.3);
		color: #dc3545;
		padding: 10px 14px;
		border-radius: 4px;
		margin-bottom: 16px;
		font-size: 0.9rem;
	}

	.success-message {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 32px 16px;
		color: #10b981;
		font-size: 1rem;
	}

	fieldset {
		border: none;
		padding: 0;
		margin: 0 0 16px 0;
	}

	fieldset legend {
		font-size: 0.9rem;
		color: var(--text-muted);
		margin-bottom: 8px;
	}

	fieldset label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-right: 16px;
		font-size: 0.95rem;
		color: var(--text-secondary);
		cursor: pointer;
	}

	fieldset input[type='radio'] {
		accent-color: var(--text-primary);
	}

	.description-label {
		display: block;
		font-size: 0.9rem;
		color: var(--text-muted);
		margin-bottom: 20px;
	}

	.description-label textarea {
		display: block;
		width: 100%;
		margin-top: 8px;
		padding: 10px 12px;
		border: 1px solid var(--border-link);
		border-radius: 4px;
		font-size: 0.95rem;
		font-family: inherit;
		background: var(--bg-canvas);
		color: var(--text-primary);
		resize: vertical;
		min-height: 100px;
	}

	.description-label textarea:focus {
		outline: none;
		border-color: var(--text-link-hover);
	}

	.description-label textarea::placeholder {
		color: var(--text-muted);
	}

	.modal-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}

	.cancel-btn {
		padding: 10px 16px;
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
		padding: 10px 16px;
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
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
